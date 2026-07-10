// routes/studyPlanChat.js
const express = require("express");
const { supabase, groq } = require("../lib/client.js");

const router = express.Router();

router.post("/study-plan-chat", async (req, res) => {
  try {
    // Verify the request actually comes from a logged-in user
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { message, history = [] } = req.body;
    // Pull the student's  subjects

    const { data: subjects } = await supabase
      .from("subjects")
      .select("name, credits, course_code")
      .eq("user_id", user.id);

    const subjectList = subjects?.length
      ? subjects.map((s) => `${s.name} (${s.course_code}, ${s.credits} credits)`).join(", ")
      : "no subjects on record yet";
    // Build a context-aware system prompt
    const systemPrompt = `You are a study planning assistant helping a student.

Their current subjects are: ${subjectList}.

Help them organize their study schedule, priorities, and habits. Use their actual subject list above when giving advice — for example, suggest how to split time across these specific subjects rather than speaking generically. If they ask about something unrelated to their subjects, that's fine too, just be a generally helpful study planning assistant.`;


    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            systemPrompt,
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

module.exports = router;