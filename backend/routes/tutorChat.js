// routes/tutorChat.js
const express = require("express");
const { supabase, getEmbedding, groq } = require("../lib/client.js");

const router = express.Router();

router.post("/tutor-chat", async (req, res) => {
  try {
    const { message, subjectCode, subjectName, semester, userId, history = [] } = req.body;
    console.log("Received tutor chat request:", { message, subjectCode, subjectName, semester, userId, history });
    const queryEmbedding = await getEmbedding(message);

    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_course_code: subjectCode,
      match_semester: semester,
      match_user_id: userId,
      match_count: 5,
    });
    if (error) throw error;

    const context =
      chunks?.length > 0
        ? chunks.map((c) => c.chunk_text).join("\n---\n")
        : "No matching notes found.";

    const systemPrompt = `You are a helpful tutor for the subject "${subjectName}". Answer using the reference material below when relevant. If it doesn't cover the question, say so honestly and answer generally.

REFERENCE MATERIAL:
${context}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("Tutor chat failed:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

module.exports = router;