// lib/googleCalendar.js
const { google } = require("googleapis");
const { getOAuthClient } = require("./googleClient");
const { supabase } = require("./client");

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
    start: { date: reminder.date },
    end: { date: reminder.date },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

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

module.exports = { pushReminderToGoogle, deleteReminderFromGoogle, startCalendarWatch, initialCalendarSync };
