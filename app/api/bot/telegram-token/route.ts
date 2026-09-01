import { NextRequest, NextResponse } from "next/server";
import { getBotConfig, updateBotConfig } from "@/lib/bot-config";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export async function GET() {
  const config = await getBotConfig();
  return NextResponse.json({ connected: !!config.telegramToken });
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    await updateBotConfig({ telegramToken: token });

    // Регистрируем вебхук в Telegram, чтобы бот начал реально получать
    // апдейты (/start и обычные сообщения). Без этого шага апдейты
    // от Telegram просто некому принимать.
    let webhookSet = false;
    let webhookError: string | undefined;

    if (SITE_URL) {
      try {
        const webhookUrl = `${SITE_URL.replace(/\/$/, "")}/api/bot/webhook`;
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
          }),
        });
        const data = await res.json();
        webhookSet = !!data.ok;
        if (!data.ok) webhookError = data.description;
      } catch (err) {
        webhookError = err instanceof Error ? err.message : "unknown error";
      }
    } else {
      webhookError = "NEXT_PUBLIC_SITE_URL не задан в .env — вебхук не был зарегистрирован автоматически";
    }

    return NextResponse.json({ success: true, connected: true, webhookSet, webhookError });
  } catch (err) {
    console.error("telegram token error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
