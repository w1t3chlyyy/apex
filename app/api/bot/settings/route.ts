import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner, upsertBotForOwner } from "@/lib/bots";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  return NextResponse.json({
    systemPrompt: bot?.systemPrompt ?? "",
    role: bot?.role ?? "",
    threshold: bot?.confidenceThreshold ?? 0.75,
  });
}

export async function POST(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bot = await upsertBotForOwner(user.id, {
      systemPrompt: body.systemPrompt,
      role: body.role,
      confidenceThreshold: body.threshold,
    });
    return NextResponse.json({
      success: true,
      settings: {
        systemPrompt: bot.systemPrompt,
        role: bot.role,
        threshold: bot.confidenceThreshold,
      },
    });
  } catch (err) {
    console.error("bot settings error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
