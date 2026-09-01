import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// In-memory store for bot settings fallback
let botSettings = {
  systemPrompt: "Ты — вежливый ассистент поддержки интернет-магазина. Отвечай кратко и по делу.",
  role: "Поддержка клиентов",
  threshold: 0.75,
};

export async function GET() {
  return NextResponse.json(botSettings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    botSettings = {
      ...botSettings,
      ...body,
    };
    return NextResponse.json({ success: true, settings: botSettings });
  } catch (err) {
    console.error("bot settings error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
