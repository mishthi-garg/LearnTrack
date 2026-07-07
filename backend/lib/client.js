const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const { createClient } = require("@supabase/supabase-js");

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values; // array of 768 floats
}