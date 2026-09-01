import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/gemini";

export const runtime = "nodejs";

const CHUNK_SIZE = 800; // символов
const CHUNK_OVERLAP = 100;

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
    const { text, botId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const chunks = chunkText(text);
    const supabase = createServiceClient();

    const rows = [];
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      rows.push({
        bot_id: botId ?? null,
        content: chunk,
        embedding,
      });
    }

    const { error } = await supabase.from("knowledge_base").insert(rows);
    if (error) throw error;

    return NextResponse.json({ chunks: rows.length });
  } catch (err) {
    console.error("rag ingest error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
