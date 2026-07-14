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

module.exports = { pushReminderToGoogle, deleteReminderFromGoogle };
