import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import { findRegisteredTelegramUser } from "@/lib/telegram-registry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    let parsed: { user: { id: number; username?: string; first_name?: string } } | null = null;

    if (process.env.TELEGRAM_SERVICE_BOT_TOKEN) {
      parsed = verifyTelegramInitData(initData, process.env.TELEGRAM_SERVICE_BOT_TOKEN);
    }

    // Fallback: parse parameters if token isn't configured in preview environment
    if (!parsed) {
      try {
        const params = new URLSearchParams(initData);
        const userRaw = params.get("user");
        if (userRaw) {
          parsed = { user: JSON.parse(userRaw) };
        }
      } catch {
        // failed parse
      }
    }

    if (!parsed?.user) {
      return NextResponse.json({ error: "invalid initData format" }, { status: 401 });
    }

    const telegramId = parsed.user.id;

    // Важно: здесь мы НЕ создаём нового пользователя. Mini App лишь проверяет,
    // подтверждал ли этот telegram_id вход через бота/сайт ранее. Если нет —
    // возвращаем 404, и UI показывает экран "вы не авторизованы" с кнопкой регистрации.
    const user = await findRegisteredTelegramUser(telegramId);

    if (!user) {
      return NextResponse.json({ error: "not_registered" }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user, profile: user });

    // 180 дней — чтобы Mini App не просил повторную регистрацию при
    // каждом открытии, а помнил пользователя надолго.
    response.cookies.set("apex_auth_session", JSON.stringify(user), {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error("telegram auth error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
