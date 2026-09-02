// Клиент для Qwen (Alibaba Cloud DashScope, OpenAI-совместимый режим).
// Полностью заменяет предыдущую интеграцию с Gemini (бывший lib/gemini.ts).
// Используется обычный fetch, поэтому новых npm-зависимостей не требуется.

const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";

// Цепочка моделей в порядке приоритета. Можно переопределить через .env:
// QWEN_MODEL_CHAIN=qwen-plus,qwen-turbo,qwen-max
const DEFAULT_CHAIN = [
  process.env.QWEN_CHAT_MODEL || "qwen-plus",
  process.env.QWEN_CHAT_FALLBACK_MODEL || "qwen-turbo",
  "qwen-max",
];

function getModelChain(): string[] {
  const raw = process.env.QWEN_MODEL_CHAIN;
  const list = raw
    ? raw.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_CHAIN;
  return Array.from(new Set(list));
}

const MAX_RETRIES_PER_MODEL = 2;
const BASE_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface QwenChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function callQwenChat(model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {
      // ignore
    }
    console.error(`[qwen] HTTP ${res.status} from ${QWEN_BASE_URL}: ${details}`);
    const err = new Error(`Qwen API error: ${res.status}${details ? ` — ${details}` : ""}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as QwenChatResponse;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429;
}

async function generateWithRetry(model: string, messages: ChatMessage[]): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
    try {
      return await callQwenChat(model, messages);
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

async function generateWithFallbackChain(messages: ChatMessage[]): Promise<string> {
  const chain = getModelChain();
  let lastError: unknown;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const text = await generateWithRetry(model, messages);
      if (i > 0) {
        console.warn(`[qwen] Ответ получен от резервной модели #${i + 1}: ${model}`);
      }
      return text;
    } catch (err) {
      lastError = err;
      const retryable = isRetryableError(err);
      const hasNext = i < chain.length - 1;

      if (!retryable) {
        console.error(`[qwen] Нефатальная для фолбека ошибка (модель ${model}):`, err);
        throw err;
      }

      if (hasNext) {
        console.warn(
          `[qwen] Модель ${model} недоступна (503/429), переключаемся на ${chain[i + 1]}`
        );
        continue;
      }

      console.error("[qwen] Все модели в цепочке фолбеков недоступны:", err);
    }
  }

  throw lastError;
}

export async function generateDemoChatResponse(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string
): Promise<string> {
  const instruction =
    systemInstruction ||
    "Ты демо-версия ИИ-ассистента для Telegram Business. Отвечай кратко, дружелюбно, на русском языке, и предлагай пользователю зарегистрироваться, чтобы подключить своего собственного ассистента.";

  const chatMessages: ChatMessage[] = [
    { role: "system", content: instruction },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  try {
    const text = await generateWithFallbackChain(chatMessages);
    return text || "Извините, не удалось сформировать ответ.";
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 503 || status === 429) {
      return "Сейчас ИИ-модель немного перегружена — попробуйте задать вопрос ещё раз через несколько секунд 🙏";
    }
    throw err;
  }
}

export async function embedText(text: string): Promise<number[]> {
  const model = process.env.QWEN_EMBEDDING_MODEL || "text-embedding-v3";

  const res = await fetch(`${QWEN_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    // ВАЖНО: передаем массив [text] вместо одиночной строки, чтобы избежать ошибки 400
    body: JSON.stringify({ model, input: [text] }),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {}
    console.error(`[qwen embeddings] HTTP ${res.status}: ${details}`);
    throw new Error(`Qwen embeddings error: ${res.status}${details ? ` — ${details}` : ""}`);
  }

  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  return data.data?.[0]?.embedding || [];
}
