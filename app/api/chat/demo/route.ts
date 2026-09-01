import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

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

    const model = getGeminiModel();
    const systemInstruction =
      "Ты демо-версия ИИ-ассистента для Telegram Business. Отвечай кратко, дружелюбно, " +
      "на русском языке, и предлагай пользователю зарегистрироваться, чтобы подключить " +
      "своего собственного ассистента.";

    const chat = model.startChat({
      history: history.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction,
    });

    const lastMessage = history[history.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("demo chat error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
