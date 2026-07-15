// lib/googleCalendar.js
const { google } = require("googleapis");
const { getOAuthClient } = require("./googleClient");
const { supabase } = require("./client");

const GOOGLE_COLORS = {
    red: "11",      // Tomato
    orange: "6",    // Tangerine
    green: "2",     // Sage
    blue: "9",      // Blueberry
    black: "8",     // Graphite
    zinc: "3",      // Grape (closest match)
};

const GOOGLE_TO_LT_COLOR = {
    "11": "red",      // Tomato
    "6": "orange",    // Tangerine
    "5": "orange",    // Banana -> closest available
    "2": "green",     // Sage
    "9": "blue",      // Blueberry
    "3": "zinc",      // Grape -> closest neutral
    "8": "black",     // Graphite
};

function addOneDay(dateString) {
    const d = new Date(dateString);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
}

async function getAuthedClientForUser(userId) {
    const { data } = await supabase
        .from("google_integrations")
        .select("refresh_token")
        .eq("user_id", userId)
        .single();

    if (!data) return null; // user hasn't connected Google

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: data.refresh_token });
    return oauth2Client;
}

async function pushReminderToGoogle(userId, reminder) {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) return null; // silently skip if not connected

    const calendar = google.calendar({ version: "v3", auth });

    const event = {
        summary: reminder.title,
        description: reminder.notes || "",
        colorId: GOOGLE_COLORS[reminder.color],
        reminders: {
            useDefault: true,
        },
    };

    if (reminder.all_day) {
       event.start = {
            date: reminder.date,
        };

        // Google expects end date to be exclusive
        event.end = {
            date: addOneDay(reminder.date),
        };
    } else {
        // Default duration = 1 hour
        const time = reminder.time?.slice(0, 5);
        let endTime = reminder.end_time.slice(0, 5);

        if (!endTime) {
            const end = new Date(`${reminder.date}T${reminder.time}`);
            end.setHours(end.getHours() + 1);
            endTime = end.toTimeString().slice(0, 5);
        }

        event.start = {
            dateTime: `${reminder.date}T${reminder.time}:00`,
            timeZone: "Asia/Kolkata",
        };

        event.end = {
            dateTime: `${reminder.date}T${endTime}:00`,
            timeZone: "Asia/Kolkata",
        };
    }
    const res = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
    });

    console.log("Event pushed to google: ", event);

    return res.data.id; // save this as reminder.google_event_id
}

async function deleteReminderFromGoogle(userId, googleEventId) {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) return;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
}

const crypto = require("crypto");

async function startCalendarWatch(userId) {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) throw new Error("Google account not connected");

    const calendar = google.calendar({
        version: "v3",
        auth,
    });

    const channelId = crypto.randomUUID();

    const response = await calendar.events.watch({
        calendarId: "primary",
        requestBody: {
            id: channelId,
            type: "web_hook",
            address: `${process.env.BACKEND_URL}/google/webhook`,
        },
    });

    await supabase
        .from("google_integrations")
        .update({
            channel_id: channelId,
            resource_id: response.data.resourceId,
            channel_expiration: new Date(
                Number(response.data.expiration)
            ).toISOString(),
        })
        .eq("user_id", userId);

    return response.data;
}

async function initialCalendarSync(userId) {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) throw new Error("Google account not connected");

    const calendar = google.calendar({
        version: "v3",
        auth,
    });

    const response = await calendar.events.list({
        calendarId: "primary",
        singleEvents: true,
    });

    const syncToken = response.data.nextSyncToken;

    await supabase
        .from("google_integrations")
        .update({
            sync_token: syncToken,
        })
        .eq("user_id", userId);

    return syncToken;
}

async function syncCalendarChanges(channelId) {
    // Find integration
    const { data: integration, error } = await supabase
        .from("google_integrations")
        .select("*")
        .eq("channel_id", channelId)
        .single();

    if (error || !integration) {
        console.error("Integration not found");
        return;
    }

    const auth = getOAuthClient();

    auth.setCredentials({
        refresh_token: integration.refresh_token,
    });

    const calendar = google.calendar({
        version: "v3",
        auth,
    });

    let response;

    try {
        response = await calendar.events.list({
            calendarId: "primary",
            syncToken: integration.sync_token,
            singleEvents: true,
        });
    } catch (err) {

        // sync token expired
        if (err.code === 410) {
            console.log("Sync token expired");
            return;
        }

        throw err;
    }

    console.log("========== CHANGES ==========");
    console.log("Items:", response.data.items?.length);
    console.log("Next Sync Token:", response.data.nextSyncToken);
    console.log(JSON.stringify(response.data, null, 2));

    for (const event of response.data.items) {

        // ---------------- DELETE ----------------

        if (event.status === "cancelled") {

            const { error } = await supabase
                .from("reminders")
                .delete()
                .eq("google_event_id", event.id);

            if (error) {
                console.error("Delete failed:", error);
            }

            continue;
        }

        // ---------------- DATE/TIME ----------------

        let date;
        let time = null;
        let endTime = null;
        let allDay = false;

        if (event.start.date) {

            // All-day event

            allDay = true;
            date = event.start.date;

        } else {

            const start = new Date(event.start.dateTime);
            const end = new Date(event.end.dateTime);

            const startStr = event.start.dateTime;
            const endStr = event.end.dateTime;

            date = startStr.substring(0, 10);
            time = startStr.substring(11, 16);
            endTime = endStr.substring(11, 16);
        }

        const reminder = {
            title: event.summary || "(No title)",
            notes: event.description || null,

            date,

            time,
            end_time: endTime,

            all_day: allDay,

            source: "google",

            color:
                GOOGLE_TO_LT_COLOR[event.colorId] ??
                "blue",

            google_event_id: event.id,

            google_calendar_id: "primary",

            user_id: integration.user_id,
        };

        // ---------------- UPSERT ----------------

        const { data: existing } = await supabase
            .from("reminders")
            .select("id")
            .eq("google_event_id", event.id)
            .maybeSingle();

        if (existing) {

            const { error } = await supabase
                .from("reminders")
                .update(reminder)
                .eq("id", existing.id);

            if (error) {
                console.error("Update failed:", error);
            }

        } else {

            const { error } = await supabase
                .from("reminders")
                .insert(reminder);

            if (error) {
                console.error("Insert failed:", error);
            }

        }

    }

    await supabase
        .from("google_integrations")
        .update({
            sync_token: response.data.nextSyncToken,
        })
        .eq("user_id", integration.user_id);
}

module.exports = { pushReminderToGoogle, deleteReminderFromGoogle, startCalendarWatch, initialCalendarSync, syncCalendarChanges };
