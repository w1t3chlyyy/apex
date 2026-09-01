import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

export async function generateDemoChatResponse(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string
): Promise<string> {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_CHAT_MODEL || "gemini-3.7-flash";

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction:
        systemInstruction ||
        "Ты демо-версия ИИ-ассистента для Telegram Business. Отвечай кратко, дружелюбно, на русском языке, и предлагай пользователю зарегистрироваться, чтобы подключить своего собственного ассистента.",
    },
  });

  return response.text || "Извините, не удалось сформировать ответ.";
}

export async function embedText(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2-preview";

  const result = await ai.models.embedContent({
    model,
    contents: text,
  });

  if (result.embeddings && result.embeddings.length > 0 && result.embeddings[0].values) {
    return result.embeddings[0].values;
  }
  return [];
}

