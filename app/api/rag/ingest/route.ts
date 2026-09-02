import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/qwen";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";

export const runtime = "nodejs";

const CHUNK_SIZE = 800; // символов
const CHUNK_OVERLAP = 100;

// In-memory fallback-кэш когда Supabase недоступен/не настроен
interface KBRow {
  bot_id: string | null;
  content: string;
  embedding: number[];
  created_at: string;
}
const inMemoryKnowledgeBase: KBRow[] = [];

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    // База знаний ВСЕГДА привязывается к боту текущего пользователя.
    const bot = await getBotByOwner(user.id);
    if (!bot) {
      return NextResponse.json(
        { error: "Сначала подключите своего Telegram-бота в разделе «Telegram Business»" },
        { status: 400 }
      );
    }
    const botId = bot.id;

    const chunks = chunkText(text);

    const rows: KBRow[] = [];
    let failedCount = 0;

    for (const chunk of chunks) {
      let embedding: number[] = [];
      try {
        embedding = await embedText(chunk);
      } catch (err) {
        console.warn("[RAG] Embedding generation failed for chunk:", err);
      }

      // ВАЖНО: раньше при ошибке эмбеддинга запись всё равно сохранялась
      // с пустым embedding и пользователю показывалось "Успешно". Из-за
      // этого база знаний выглядела заполненной, но поиск по ней ничего
      // не находил. Теперь такие фрагменты пропускаем и считаем отдельно.
      if (!embedding || embedding.length === 0) {
        failedCount++;
        continue;
      }

      rows.push({
        bot_id: botId,
        content: chunk,
        embedding,
        created_at: new Date().toISOString(),
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Не удалось создать эмбеддинги ни для одного фрагмента. Проверьте, что переменная окружения QWEN_API_KEY задана в настройках Next.js-приложения (это ДРУГАЯ переменная окружения, чем у Python-сервиса — задать нужно в обоих местах).",
        },
        { status: 502 }
      );
    }

    let savedToSupabase = false;
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createServiceClient();
        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          console.warn("[RAG] Supabase insert failed, using in-memory store:", error.message);
          inMemoryKnowledgeBase.push(...rows);
        } else {
          savedToSupabase = true;
        }
      } else {
        inMemoryKnowledgeBase.push(...rows);
      }
    } catch (err) {
      console.warn("[RAG] Supabase insert threw, using in-memory store:", err);
      inMemoryKnowledgeBase.push(...rows);
    }

    return NextResponse.json({
      chunks: rows.length,
      failedChunks: failedCount,
      botId,
      persistent: savedToSupabase,
      warning: !savedToSupabase
        ? "Supabase не настроен или недоступен — данные сохранены только в памяти сервера и пропадут при перезапуске."
        : undefined,
    });
  } catch (err) {
    console.error("rag ingest error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// Список уже сохранённых фрагментов базы знаний текущего пользователя —
// раньше в кабинете не было способа увидеть, что реально сохранилось.
export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const bot = await getBotByOwner(user.id);
    if (!bot) {
      return NextResponse.json({ items: [], botConnected: false });
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("knowledge_base")
          .select("id, content, created_at")
          .eq("bot_id", bot.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (!error) {
          return NextResponse.json({
            items: (data || []).map((r) => ({
              id: r.id,
              preview: (r.content || "").slice(0, 160),
              createdAt: r.created_at,
            })),
            botConnected: true,
          });
        }
      } catch (err) {
        console.warn("[RAG] Supabase list failed, falling back to memory:", err);
      }
    }

    const items = inMemoryKnowledgeBase
      .filter((r) => r.bot_id === bot.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((r, i) => ({
        id: `mem_${i}`,
        preview: r.content.slice(0, 160),
        createdAt: r.created_at,
      }));

    return NextResponse.json({ items, botConnected: true });
  } catch (err) {
    console.error("rag list error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
