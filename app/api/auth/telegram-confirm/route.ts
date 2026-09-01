import { NextRequest, NextResponse } from "next/server";
import { confirmTelegramSession, getTelegramSession } from "@/lib/session-store";
import { registerTelegramUser } from "@/lib/telegram-registry";
import type { AuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, telegramUser } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const existingSession = await getTelegramSession(sessionId);
    if (!existingSession) {
      return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
    }

    const user: AuthUser = {
      id: telegramUser?.id ? `tg_${telegramUser.id}` : `tg_${Date.now()}`,
      name: telegramUser?.first_name || telegramUser?.username || "Telegram User",
      telegramUsername: telegramUser?.username || "HustlifyUser",
      telegramId: telegramUser?.id || 123456789,
      photoUrl: telegramUser?.photo_url,
      authMethod: "telegram_bot",
      createdAt: new Date().toISOString(),
    };

    const confirmed = await confirmTelegramSession(sessionId, user);
    if (!confirmed) {
      return NextResponse.json({ error: "Failed to confirm session" }, { status: 400 });
    }

    // Помечаем пользователя как "зарегистрированного", чтобы Mini App
    // в дальнейшем пускал его без экрана "вы не авторизованы".
    await registerTelegramUser(user);

    return NextResponse.json({
      success: true,
      message: "Session confirmed successfully",
      user,
    });
  } catch (error) {
    console.error("Error confirming session:", error);
    return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
  }
}
