import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import { findRegisteredTelegramUser } from "@/lib/telegram-registry";
import { SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/session-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_SERVICE_BOT_TOKEN;
    if (!botToken) {
      console.error("[auth/telegram] TELEGRAM_SERVICE_BOT_TOKEN не задан");
      return NextResponse.json({ error: "service unavailable" }, { status: 503 });
    }

    // Только проверенная подпись Telegram. Фолбэка на неподписанный initData нет.
    const parsed = verifyTelegramInitData(initData, botToken);
    if (!parsed?.user) {
      return NextResponse.json({ error: "invalid initData" }, { status: 401 });
    }

    // Mini App не создаёт пользователей: пускает только тех, кто уже
    // подтвердил вход через бота/сайт.
    const user = await findRegisteredTelegramUser(parsed.user.id);
    if (!user) {
      return NextResponse.json({ error: "not_registered" }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user, profile: user });
    response.cookies.set(SESSION_COOKIE, signSession(user), sessionCookieOptions());
    return response;
  } catch (err) {
    console.error("telegram auth error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
