import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/qwen";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";

export const runtime = "nodejs";

const CHUNK_SIZE = 800; // символов
const CHUNK_OVERLAP = 100;

// In-memory fallback-кэш когда Supabase недоступен/не настроен
const inMemoryKnowledgeBase: Array<{
  bot_id: string | null;
  content: string;
  embedding: number[];
}> = [];

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

    const rows = [];
    for (const chunk of chunks) {
      let embedding: number[] = [];
      try {
        embedding = await embedText(chunk);
      } catch (err) {
        console.warn("[RAG] Embedding generation warning (Qwen), continuing with fallback:", err);
      }
      rows.push({
        bot_id: botId,
        content: chunk,
        embedding,
      });
    }

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createServiceClient();
        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          console.warn("[RAG] Supabase insert failed, using in-memory store:", error.message);
          inMemoryKnowledgeBase.push(...rows);
        }
      } else {
        inMemoryKnowledgeBase.push(...rows);
      }
    } catch {
      inMemoryKnowledgeBase.push(...rows);
    }

    return NextResponse.json({ chunks: rows.length, botId });
  } catch (err) {
    console.error("rag ingest error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
