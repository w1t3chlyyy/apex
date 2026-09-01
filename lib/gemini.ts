import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
  });
}

export async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
  });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
