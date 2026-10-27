import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner, upsertBotForOwner } from "@/lib/bots";

export const runtime = "nodejs";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "";
const TOKEN_RE = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;

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

  // Без Telegram ID владельца бот не сможет присылать уведомления об
  // эскалации и отличать ваши сообщения клиентам от сообщений клиентов.
  if (!user.telegramId) {
    return NextResponse.json(
      {
        error:
          "Для подключения бота войдите в кабинет через Telegram — туда приходят уведомления, когда нужен ответ оператора.",
      },
      { status: 400 }
    );
  }

  try {
    const { token: rawToken } = await req.json();
    const token = typeof rawToken === "string" ? rawToken.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    if (!TOKEN_RE.test(token)) {
      return NextResponse.json(
        { error: "Неверный формат токена. Он выглядит как 1234567890:ABC... (из @BotFather)" },
        { status: 400 }
      );
    }

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

    const bot = await upsertBotForOwner(user.id, {
      botApiToken: token,
      ownerTelegramId: user.telegramId,
    });

    let webhookSet = false;
    let webhookError: string | undefined;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!PYTHON_SERVICE_URL) {
      webhookError = "PYTHON_SERVICE_URL не задан — вебхук RAG-сервиса не зарегистрирован";
      console.warn(`[telegram-token] ${webhookError}`);
    } else if (!webhookSecret) {
      webhookError = "TELEGRAM_WEBHOOK_SECRET не задан — вебхук не зарегистрирован (без секрета сервис отклоняет запросы)";
      console.warn(`[telegram-token] ${webhookError}`);
    } else {
      try {
        const webhookUrl = `${PYTHON_SERVICE_URL.replace(/\/$/, "")}/webhook/business/${bot.id}`;
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: webhookSecret,
            // Без allowed_updates Telegram не присылает события Business.
            allowed_updates: [
              "message",
              "business_connection",
              "business_message",
              "edited_business_message",
              "deleted_business_messages",
            ],
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
