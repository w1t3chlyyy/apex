// Клиент для Qwen (Alibaba Cloud DashScope, OpenAI-совместимый режим).
// Раньше здесь также жила логика демо-чата (generateDemoChatResponse) и
// Gemini-фолбэк для неё — при удалении демо-чата с лендинга (components/
// DemoChat.tsx, app/api/chat/demo/route.ts) вся эта цепочка стала мёртвым
// кодом и убрана. embedText по-прежнему используется базой знаний (RAG).

const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";

export async function embedText(text: string): Promise<number[]> {
  const model = process.env.QWEN_EMBEDDING_MODEL || "text-embedding-v3";

  const res = await fetch(`${QWEN_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    throw new Error(`Qwen embeddings error: ${res.status}`);
  }

  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  return data.data?.[0]?.embedding || [];
}
