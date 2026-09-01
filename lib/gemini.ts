// lib/gemini.ts
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

// Цепочка моделей в порядке приоритета. Можно переопределить через .env:
// GEMINI_MODEL_CHAIN=gemini-3.7-flash,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
const DEFAULT_CHAIN = [
  process.env.GEMINI_CHAT_MODEL || "gemini-3.7-flash",
  process.env.GEMINI_CHAT_FALLBACK_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

function getModelChain(): string[] {
  const raw = process.env.GEMINI_MODEL_CHAIN;
  const list = raw ? raw.split(",").map((m) => m.trim()).filter(Boolean) : DEFAULT_CHAIN;
  // убираем дубли, сохраняя порядок
  return Array.from(new Set(list));
}

const MAX_RETRIES_PER_MODEL = 2;
const BASE_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  // 503 — модель перегружена, 429 — рейт-лимит. В обоих случаях
  // имеет смысл либо ретраить, либо переключиться на следующую модель в цепочке.
  return status === 503 || status === 429;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction },
      });
      return response;
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === MAX_RETRIES_PER_MODEL) {
        throw err;
      }
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

/**
 * Пытается сгенерировать ответ, последовательно проходя по цепочке моделей.
 * Переход к следующей модели происходит только при retryable-ошибке (503/429).
 * Любая другая ошибка (например, неверный запрос) прерывает цепочку сразу.
 */
async function generateWithFallbackChain(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
) {
  const ai = getGeminiClient();
  const chain = getModelChain();

  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const response = await generateWithRetry(ai, model, contents, systemInstruction);
      if (i > 0) {
        console.warn(`[gemini] Ответ получен от фолбек-модели #${i + 1}: ${model}`);
      }
      return response;
    } catch (err) {
      lastError = err;
      const retryable = isRetryableError(err);
      const hasNext = i < chain.length - 1;

      if (!retryable) {
        console.error(`[gemini] Нефатальная ошибка не подлежит фолбеку (модель ${model}):`, err);
        throw err;
      }

      if (hasNext) {
        console.warn(
          `[gemini] Модель ${model} недоступна (503/429), переключаемся на ${chain[i + 1]}`
        );
        continue;
      }

      console.error("[gemini] Все модели в цепочке фолбеков недоступны:", err);
    }
  }

  throw lastError;
}

export async function generateDemoChatResponse(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const instruction =
    systemInstruction ||
    "Ты демо-версия ИИ-ассистента для Telegram Business. Отвечай кратко, дружелюбно, на русском языке, и предлагай пользователю зарегистрироваться, чтобы подключить своего собственного ассистента.";

  const response = await generateWithFallbackChain(contents, instruction);
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
