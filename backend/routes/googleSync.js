// routes/googleSync.js
const express = require("express");
const { supabase } = require("../lib/client");
const { pushReminderToGoogle, deleteReminderFromGoogle } = require("../lib/googleCalendar");

const router = express.Router();

router.post("/reminders/:id/sync-google", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: reminder, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !reminder) return res.status(404).json({ error: "Reminder not found" });

  try {
    const googleEventId = await pushReminderToGoogle(user.id, reminder);
    if (googleEventId) {
      await supabase.from("reminders").update({ google_event_id: googleEventId }).eq("id", reminder.id);
    }
    res.json({ googleEventId });
  } catch (err) {
    console.error("Google sync failed:", err);
    res.status(500).json({ error: "Google sync failed" });
  }
});

router.delete("/reminders/:id/sync-google", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { googleEventId } = req.body; // pass this from frontend before you delete the row

  try {
    if (googleEventId) await deleteReminderFromGoogle(user.id, googleEventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("Google delete failed:", err);
    res.status(500).json({ error: "Google delete failed" });
  }
});

module.exports = router;