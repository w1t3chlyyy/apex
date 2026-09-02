import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner, upsertBotForOwner } from "@/lib/bots";

export const runtime = "nodejs";

// URL Python-сервиса (bot.py) с RAG-логикой. Именно туда, а не в Next.js,
// теперь регистрируется вебхук бота-агента конкретного пользователя.
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  return NextResponse.json({
    connected: !!bot?.botApiToken,
    webhookRegistered: !!bot?.webhookRegistered,
    botId: bot?.id ?? null,
  });
}

export async function POST(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Необходимо авторизоваться в личном кабинете" }, { status: 401 });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    // Проверяем токен через Telegram API
    let botInfo: { id?: number; username?: string } = {};
    try {
      const checkResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const checkData = await checkResponse.json();
      if (!checkResponse.ok || !checkData.ok) {
        return NextResponse.json(
          { error: `Неверный токен: ${checkData.description || "проверьте формат"}` },
          { status: 400 }
        );
      }
      botInfo = checkData.result;
    } catch {
      return NextResponse.json(
        { error: "Не удалось проверить токен. Проверьте интернет-соединение." },
        { status: 500 }
      );
    }

    // Сохраняем бота, привязанного к ТЕКУЩЕМУ пользователю (не singleton).
    const bot = await upsertBotForOwner(user.id, {
      botApiToken: token,
      ownerTelegramId: user.telegramId ?? null,
    });

    // Регистрируем вебхук на PYTHON-сервисе — там живёт RAG-логика агента,
    // а не на /api/bot/webhook в Next.js (это отдельный сервисный бот).
    let webhookSet = false;
    let webhookError: string | undefined;

    if (!PYTHON_SERVICE_URL) {
      webhookError =
        "PYTHON_SERVICE_URL не задан в .env — вебхук RAG-сервиса не был зарегистрирован автоматически";
      console.warn(`[telegram-token] ${webhookError}`);
    } else {
      try {
        const webhookUrl = `${PYTHON_SERVICE_URL.replace(/\/$/, "")}/webhook/business/${bot.id}`;
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

        if (!data.ok) {
          webhookError = data.description;
          console.error(`[telegram-token] Ошибка установки вебхука: ${webhookError}`);
        }
      } catch (err) {
        webhookError = err instanceof Error ? err.message : "unknown error";
        console.error(`[telegram-token] Ошибка при установке вебхука: ${webhookError}`);
      }
    }

    await upsertBotForOwner(user.id, { webhookRegistered: webhookSet });

    return NextResponse.json({
      success: true,
      connected: true,
      botId: bot.id,
      botUsername: botInfo.username,
      webhookSet,
      webhookError,
    });
  } catch (err) {
    console.error("[telegram-token] Ошибка:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
