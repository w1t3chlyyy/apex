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
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.warn("[bot webhook] Не удалось отправить сообщение в Telegram:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Необязательная проверка: если при регистрации вебхука был передан
    // secret_token (см. TELEGRAM_WEBHOOK_SECRET), Telegram присылает его
    // в этом заголовке — так мы отсекаем запросы не от Telegram.
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const gotSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (gotSecret !== expectedSecret) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    if (!message?.text || !message.from) {
      // Не текстовое сообщение (стикер, фото и т.д.) — просто подтверждаем получение.
      return NextResponse.json({ ok: true });
    }

    const config = await getBotConfig();
    if (!config.telegramToken) {
      console.warn("[bot webhook] Получен апдейт, но токен бота не сконфигурирован в /dashboard/telegram");
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Deep-link из /login выглядит как https://t.me/<bot>?start=auth_<sessionId>
    // Telegram превращает такой переход в команду "/start auth_<sessionId>".
    const startMatch = text.match(/^\/start(?:@\S+)?\s+auth_([a-zA-Z0-9]+)/);

    if (startMatch) {
      const sessionId = startMatch[1];
      const existingSession = await getTelegramSession(sessionId);

      if (!existingSession || existingSession.status === "expired") {
        await sendTelegramMessage(
          config.telegramToken,
          chatId,
          "Ссылка для входа устарела. Обновите QR-код или ссылку на сайте (кнопка обновления рядом со статусом) и попробуйте снова."
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
      // Помечаем пользователя как "зарегистрированного", чтобы Mini App
      // в дальнейшем пускал его без экрана "вы не авторизованы".
      await registerTelegramUser(user);

      await sendTelegramMessage(
        config.telegramToken,
        chatId,
        "Готово! Вход на сайте подтверждён — можете вернуться на вкладку с сайтом, она обновится автоматически."
      );

      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      await sendTelegramMessage(
        config.telegramToken,
        chatId,
        "Привет! Это бот для входа в личный кабинет. Чтобы авторизоваться, откройте сайт и нажмите «Перейти в Telegram-бота» на странице входа — оттуда откроется правильная ссылка с кодом входа."
      );
      return NextResponse.json({ ok: true });
    }

    // Заглушка для остальных сообщений. Сюда в будущем можно подключить
    // реальную RAG-логику (сейчас она работает только в демо-чате на сайте).
    await sendTelegramMessage(
      config.telegramToken,
      chatId,
      "Спасибо за сообщение! Полноценный AI-ассистент по вашей базе знаний подключается после регистрации в личном кабинете на сайте."
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bot webhook] error", err);
    // Telegram ретраит доставку апдейта при ошибке — отвечаем 200, чтобы
    // не заспамить очередь повторными попытками на уже сломанном апдейте.
    return NextResponse.json({ ok: true });
  }
}

// Telegram иногда делает проверочный GET на URL вебхука — отвечаем 200.
export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook endpoint is alive" });
}
