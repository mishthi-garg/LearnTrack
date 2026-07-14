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

module.exports = router;