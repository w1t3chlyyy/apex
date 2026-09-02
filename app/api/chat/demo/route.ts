import { NextRequest, NextResponse } from "next/server";
import { generateDemoChatResponse } from "@/lib/qwen";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Демо-чат ограничен на клиенте (5 сообщений/сессию через localStorage).
    // Здесь дополнительно ограничиваем длину истории, отправляемой в модель.
    const history = messages.slice(-10);

    const reply = await generateDemoChatResponse(history);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("demo chat error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
