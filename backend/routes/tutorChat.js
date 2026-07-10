// routes/tutorChat.js
const express = require("express");
const { supabase, getEmbedding, groq } = require("../lib/client.js");

const router = express.Router();

router.post("/tutor-chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { message, subjectCode, subjectName, semester, history = [] } = req.body;
    const userId = user.id;
    //console.log("Received tutor chat request:", { message, subjectCode, subjectName, semester, userId, history });
    const queryEmbedding = await getEmbedding(message);
    // crude heuristic: broad "teach me" requests get more context than narrow questions
    const isBroadRequest = /teach|explain|walk me through|go over|summarize|cover/i.test(message);
    const matchCount = isBroadRequest ? 12 : 5;
    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_course_code: subjectCode,
      match_semester: semester,
      match_user_id: userId,
      match_count: matchCount,
    });
    if (error) throw error;

    const context =
      chunks?.length > 0
        ? chunks.map((c) => c.chunk_text).join("\n---\n")
        : "No matching notes found.";

    const systemPrompt = `You are a helpful tutor for the subject "${subjectName}".
Guidelines:
- If the student sends a greeting or casual remark, just respond naturally.
- If the student asks a specific question, answer using the reference material when relevant.
- If the student asks to "teach", "explain", "go over", or "help me understand" a topic, teach it like a real tutor would:
  1. Start with a simple definition.
  2. Explain the concept step by step.
  3. Highlight the key ideas.
  4. Give an intuitive example.
  5. End with a short recap and, if appropriate, ask a follow-up question to check understanding.
Reference material:
- The reference material was extracted via OCR from handwritten notes and may contain typos or garbled phrasing. Interpret charitably, correct obvious errors mentally, and never quote it verbatim — always explain in your own clear words.
Teaching style:
- Keep the tone warm and encouraging, like a patient tutor, not a search engine reciting facts.
- Prefer understanding over memorization.
Formatting requirements:
- Use Markdown.
- Break answers into clear sections using headings (##).
- Prefer bullet points and numbered lists over long paragraphs.
- Use **bold** to emphasize important terms.
- Use tables only when comparing concepts.
- Use code blocks for code, formulas, or assembly examples.
- Avoid walls of text.
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