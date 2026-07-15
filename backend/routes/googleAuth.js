const express = require("express");
const { getOAuthClient } = require("../lib/googleClient");
const {
    initialCalendarSync,
    startCalendarWatch,
} = require("../lib/googleCalendar");
const { supabase } = require("../lib/client");

const router = express.Router();

// Step A: redirect user to Google's consent screen
router.get("/auth/google", (req, res) => {
    const oauth2Client = getOAuthClient();
    const userId = req.query.user_id; // pass this from frontend so you know who's connecting

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",       // required to get a refresh_token
        prompt: "consent",            // forces refresh_token on repeat connections
        scope: ["https://www.googleapis.com/auth/calendar.events"],
        state: userId,                // carries user id through the redirect
    });

    res.redirect(url);
});

// Step B: handle Google's redirect back with the auth code
router.get("/auth/google/callback", async (req, res) => {
    const { code, state: userId } = req.query;
    const oauth2Client = getOAuthClient();

    try {
        const { tokens } = await oauth2Client.getToken(code);
        // tokens.refresh_token is only sent the FIRST time a user consents
        if (tokens.refresh_token) {
            await supabase
                .from("google_integrations")
                .upsert({ user_id: userId, refresh_token: tokens.refresh_token });
        }
        await initialCalendarSync(userId);
        await startCalendarWatch(userId);
        // Redirect back to your frontend
        res.redirect(`${process.env.FRONTEND_URL}/timetable?google=connected`);
    } catch (err) {
        console.error("Google OAuth error:", err);
        res.redirect(`${process.env.FRONTEND_URL}/timetable?google=error`);
    }
});

// Check connection status
router.get("/auth/google/status", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const { data, error } = await supabase
        .from("google_integrations")
        .select("user_id, channel_expiration")
        .eq("user_id", user_id)
        .maybeSingle();

    if (error) {
        console.error("Status check failed:", error);
        return res.status(500).json({ error: error.message });
    }

    res.json({
        connected: !!data,
        channelExpiration: data?.channel_expiration || null,
    });
});

// Disconnect
router.post("/auth/google/disconnect", async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const { data: integration, error: fetchError } = await supabase
        .from("google_integrations")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

    if (fetchError) {
        console.error("Failed to fetch integration:", fetchError);
        return res.status(500).json({ error: fetchError.message });
    }

    if (integration) {
        // Best effort: stop the push channel so Google stops sending webhooks
        try {
            const oauth2Client = getOAuthClient();
            oauth2Client.setCredentials({ refresh_token: integration.refresh_token });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            if (integration.channel_id && integration.resource_id) {
                await calendar.channels.stop({
                    requestBody: {
                        id: integration.channel_id,
                        resourceId: integration.resource_id,
                    },
                });
            }
        } catch (err) {
            console.error("Failed to stop channel (may already be expired):", err.message);
        }

        const { error: deleteError } = await supabase
            .from("google_integrations")
            .delete()
            .eq("user_id", user_id);

        if (deleteError) {
            console.error("Failed to delete integration:", deleteError);
            return res.status(500).json({ error: deleteError.message });
        }
    }

    res.json({ disconnected: true });
});

module.exports = router;