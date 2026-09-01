import { NextRequest, NextResponse } from "next/server";
import { getBotConfig } from "@/lib/bot-config";
import { confirmTelegramSession, getTelegramSession } from "@/lib/session-store";
import { registerTelegramUser } from "@/lib/telegram-registry";
import type { AuthUser } from "@/lib/auth";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: {
      id: number;
      first_name?: string;
      username?: string;
    };
  };
};

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn("[bot webhook] Ошибка при отправке сообщения:", errorData);
    }
  } catch (err) {
    console.warn("[bot webhook] Не удалось отправить сообщение в Telegram:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Проверка secret_token (защита от поддельных запросов)
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const gotSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (gotSecret !== expectedSecret) {
        console.warn("[bot webhook] Неверный secret_token");
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    if (!message?.text || !message.from) {
      // Не текстовое сообщение — просто подтверждаем получение
      return NextResponse.json({ ok: true });
    }

    // 🔥 ОСНОВНОЕ ИСПРАВЛЕНИЕ: получаем токен через getBotConfig()
    const config = await getBotConfig();
    if (!config.telegramToken) {
      console.warn("[bot webhook] Получен апдейт, но токен бота не сконфигурирован в /dashboard/telegram");
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Deep-link из /login: /start auth_<sessionId>
    const startMatch = text.match(/^\/start(?:@\S+)?\s+auth_([a-zA-Z0-9]+)/);

    if (startMatch) {
      const sessionId = startMatch[1];
      const existingSession = await getTelegramSession(sessionId);

      if (!existingSession || existingSession.status === "expired") {
        await sendTelegramMessage(
          config.telegramToken,
          chatId,
          "Ссылка для входа устарела. Обновите QR-код или ссылку на сайте и попробуйте снова."
        );
        return NextResponse.json({ ok: true });
      }

      const user: AuthUser = {
        id: `tg_${message.from.id}`,
        name: message.from.first_name || message.from.username || "Telegram User",
        telegramUsername: message.from.username,
        telegramId: message.from.id,
        authMethod: "telegram_bot",
        createdAt: new Date().toISOString(),
      };

      await confirmTelegramSession(sessionId, user);
      await registerTelegramUser(user);

      await sendTelegramMessage(
        config.telegramToken,
        chatId,
        "Готово! Вход на сайте подтверждён — вернитесь на вкладку с сайтом, она обновится автоматически."
      );

      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      await sendTelegramMessage(
        config.telegramToken,
        chatId,
        "Привет! Это бот для входа в личный кабинет. Чтобы авторизоваться, откройте сайт и нажмите «Перейти в Telegram-бота» на странице входа."
      );
      return NextResponse.json({ ok: true });
    }

    // Заглушка для остальных сообщений
    await sendTelegramMessage(
      config.telegramToken,
      chatId,
      "Спасибо за сообщение! Полноценный AI-ассистент по вашей базе знаний подключается после регистрации в личном кабинете на сайте."
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bot webhook] error", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook endpoint is alive" });
}
