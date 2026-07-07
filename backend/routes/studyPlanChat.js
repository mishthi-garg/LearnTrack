// routes/studyPlanChat.js
const express = require("express");
const { groq } = require("../lib/clients.js");

const router = express.Router();

router.post("/study-plan-chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a study planning assistant. Help the student organize their schedule, priorities, and study habits.",
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("Study plan chat failed:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;