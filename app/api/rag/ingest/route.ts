import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/qwen";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";

export const runtime = "nodejs";

const CHUNK_SIZE = 800; // символов
const CHUNK_OVERLAP = 100;

// In-memory fallback-кэш когда Supabase недоступен/не настроен.
// ВАЖНО: раньше падение в этот fallback НЕ отражалось в ответе клиенту —
// пользователь видел "Успешно добавлено" даже если реальная запись в
// Supabase не произошла (например, из-за упавшего эмбеддинга или ошибки
// вставки). Теперь роут явно возвращает предупреждение/ошибку в таких
// случаях вместо того, чтобы врать об успехе.
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
    let embeddingFailures = 0;
    let lastEmbeddingError: string | null = null;

    for (const chunk of chunks) {
      let embedding: number[] = [];
      try {
        embedding = await embedText(chunk);
        if (!embedding.length) {
          // Qwen может вернуть 200, но пустой массив embeddings — тоже
          // считаем это ошибкой, а не "успешным" пустым вектором.
          throw new Error("Qwen вернул пустой embedding");
        }
      } catch (err) {
        embeddingFailures++;
        lastEmbeddingError = err instanceof Error ? err.message : String(err);
        console.error("[RAG] Ошибка генерации эмбеддинга (Qwen), фрагмент пропущен:", err);
        // Пустой embedding больше НЕ отправляем в Supabase — вставка
        // пустого вектора в колонку vector(1024) либо упадёт с ошибкой
        // размерности, либо (если колонка nullable) молча создаст
        // бесполезную запись, которую RAG-поиск никогда не найдёт.
        continue;
      }
      rows.push({ bot_id: botId, content: chunk, embedding });
    }

    if (rows.length === 0) {
      // Все чанки не удалось векторизовать — раньше в этом случае роут
      // всё равно отвечал {chunks: 0} с кодом 200, и UI показывал
      // "Успешно" при нулевом реальном результате.
      return NextResponse.json(
        {
          error: `Не удалось векторизовать ни одного фрагмента. Ошибка Qwen: ${
            lastEmbeddingError || "неизвестна"
          }`,
        },
        { status: 502 }
      );
    }

    let insertedToSupabase = false;
    let supabaseErrorMessage: string | null = null;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createServiceClient();
        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          supabaseErrorMessage = error.message;
          console.error("[RAG] Supabase insert failed:", error.message);
          inMemoryKnowledgeBase.push(...rows);
        } else {
          insertedToSupabase = true;
        }
      } catch (err) {
        supabaseErrorMessage = err instanceof Error ? err.message : String(err);
        console.error("[RAG] Supabase insert threw:", err);
        inMemoryKnowledgeBase.push(...rows);
      }
    } else {
      supabaseErrorMessage = "Supabase не настроен (нет NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)";
      inMemoryKnowledgeBase.push(...rows);
    }

    // Если реальная запись в Supabase не произошла — это НЕ полноценный
    // успех: данные попали только в эфемерную память текущего serverless-
    // инстанса и пропадут при следующем вызове/деплое. Явно сообщаем об
    // этом клиенту вместо тихого "Успешно".
    if (!insertedToSupabase) {
      return NextResponse.json(
        {
          error: `Фрагменты обработаны (${rows.length}), но НЕ сохранены в базу данных: ${supabaseErrorMessage}. Данные будут потеряны при следующем перезапуске сервера — база знаний реально не пополнилась.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      chunks: rows.length,
      botId,
      skippedChunks: embeddingFailures,
      warning:
        embeddingFailures > 0
          ? `${embeddingFailures} фрагмент(ов) не удалось векторизовать и они были пропущены (последняя ошибка: ${lastEmbeddingError}).`
          : undefined,
    });
  } catch (err) {
    console.error("rag ingest error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
