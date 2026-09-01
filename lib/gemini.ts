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

const PRIMARY_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.7-flash";
// Используется, если основная модель стабильно недоступна (503) — как правило,
// более "взрослые" стабильные модели реже перегружены, чем свежие preview-версии.
const FALLBACK_MODEL = process.env.GEMINI_CHAT_FALLBACK_MODEL || "gemini-2.5-flash";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  // 503 — модель временно перегружена ("high demand"), 429 — рейт-лимит.
  // Оба случая имеет смысл ретраить с паузой.
  return status === 503 || status === 429;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction },
      });
      return response;
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err;
      }
      // Экспоненциальная пауза перед повтором: 600мс, 1200мс...
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

export async function generateDemoChatResponse(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string
): Promise<string> {
  const ai = getGeminiClient();

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const instruction =
    systemInstruction ||
    "Ты демо-версия ИИ-ассистента для Telegram Business. Отвечай кратко, дружелюбно, на русском языке, и предлагай пользователю зарегистрироваться, чтобы подключить своего собственного ассистента.";

  try {
    const response = await generateWithRetry(ai, PRIMARY_MODEL, contents, instruction);
    return response.text || "Извините, не удалось сформировать ответ.";
  } catch (err) {
    if (isRetryableError(err) && FALLBACK_MODEL !== PRIMARY_MODEL) {
      console.warn(
        `[gemini] ${PRIMARY_MODEL} перегружена (503/429), пробуем фолбэк-модель ${FALLBACK_MODEL}`
      );
      try {
        const response = await generateWithRetry(ai, FALLBACK_MODEL, contents, instruction);
        return response.text || "Извините, не удалось сформировать ответ.";
      } catch (fallbackErr) {
        console.error("[gemini] Фолбэк-модель тоже недоступна:", fallbackErr);
        throw fallbackErr;
      }
    }
    throw err;
  }
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
