import { NextRequest, NextResponse } from "next/server";
import { getBotConfig, updateBotConfig } from "@/lib/bot-config";

export const runtime = "nodejs";

export async function GET() {
  const config = await getBotConfig();
  return NextResponse.json({
    systemPrompt: config.systemPrompt,
    role: config.role,
    threshold: config.threshold,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await updateBotConfig({
      systemPrompt: body.systemPrompt,
      role: body.role,
      threshold: body.threshold,
    });
    return NextResponse.json({
      success: true,
      settings: {
        systemPrompt: config.systemPrompt,
        role: config.role,
        threshold: config.threshold,
      },
    });
  } catch (err) {
    console.error("bot settings error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
