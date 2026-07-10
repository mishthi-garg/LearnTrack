// routes/studyPlanChat.js
const express = require("express");
const { supabase, groq } = require("../lib/client.js");

const router = express.Router();

router.post("/study-plan-chat", async (req, res) => {
  try {
    console.log("1. Request received");
    // Verify the request actually comes from a logged-in user
    const authHeader = req.headers.authorization;
     console.log("2. Auth header exists:", !!authHeader);
    const token = authHeader?.split(" ")[1];
    console.log("3. Token exists:", !!token);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      console.log("4. Auth error:", authError);
    console.log("5. User:", user?.id);

    if (authError || !user) {
      console.log("6. Unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { message, history = [] } = req.body;
    // Pull the student's  subjects
  console.log("7. Before subjects query");
    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("name, credits, course_code")
      .eq("user_id", user.id);
console.log("8. Subjects:", subjects);
console.log("Subjects error:", subjectsError);
    const subjectList = subjects?.length
      ? subjects.map((s) => `${s.name} (${s.course_code}, ${s.credits} credits)`).join(", ")
      : "no subjects on record yet";
    console.log("9. subjects list", subjectList);
    // Build a context-aware system prompt
    const systemPrompt = `You are a friendly and organized study planning assistant.

      The student's current subjects are:
      ${subjectList}

      Your goal is to help the student study more effectively by creating realistic, practical, and personalized study plans.

      Guidelines:
      - Base your recommendations on the student's actual subjects whenever relevant, and suggest how to divide time among these specific subjects instead of giving generic advice.
      - If the student asks about productivity, motivation, revision, exams, or time management, tailor your advice to their subjects.
      - If the student asks about something unrelated to their subjects, answer normally while maintaining your role as a helpful study planning assistant.
      - If the student has no subjects on record, ask them to list their current subjects before making subject-specific recommendations.

      Planning Principles:
      - Prioritize subjects that need more effort while ensuring all subjects receive attention. If you don't know which subjects need more focus, ask the student which ones they find hardest before assuming.
      - Recommend realistic study durations with breaks, and encourage consistency over unrealistic schedules.
      - Balance learning new topics, revision, and practice.
      - Suggest active learning techniques such as solving problems, teaching back concepts, flashcards, and spaced repetition when appropriate.
      - If enough information is available, create a day-wise or week-wise study plan. If important details are missing (available study hours, upcoming exams, deadlines, weak subjects, etc.), ask concise follow-up questions before making a detailed plan.

      Formatting:
      - Use Markdown, with headings only when they improve readability.
      - Use bullet points or numbered lists for plans, schedules, and action items.
      - Keep paragraphs to 2–3 sentences maximum, and avoid large walls of text.
      - Use **bold** to highlight important tasks, priorities, or deadlines.
      - Use tables only when comparing schedules or study allocations.
      - End longer responses with a short **Next Steps** section containing 2–5 actionable tasks.

      Tone:
      - Be encouraging, supportive, and practical — clear, actionable advice instead of vague motivation.
      - Focus on helping the student build sustainable study habits rather than perfect schedules.`;

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