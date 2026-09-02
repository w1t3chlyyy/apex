import { NextRequest, NextResponse } from "next/server";
import { confirmTelegramSession, getTelegramSession } from "@/lib/session-store";
import { registerTelegramUser } from "@/lib/telegram-registry";
import { createServiceClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/auth";

export const runtime = "nodejs";

// ВАЖНО: это ЕДИНСТВЕННЫЙ вебхук сервисного бота авторизации.
// У одного Telegram-бота может быть только ОДИН webhook URL, а сервисный
// бот отвечает за ДВЕ вещи: (1) вход в личный кабинет по /start auth_xxx и
// (2) пересылку ответа владельца клиенту, когда RAG-агент передал диалог
// человеку (см. notify_owner в python-service/bot.py). Раньше это были два
// разных вебхука (/api/bot/webhook здесь и /webhook/service в Python) —
// Telegram принял бы только последний зарегистрированный, второй бы не
// работал. Поэтому обработка "ответа владельца" тоже перенесена сюда;
// /webhook/service в bot.py оставлен в коде, но регистрировать его как
// webhook сервисного бота больше не нужно.
//
// Также этот роут больше НЕ берёт токен через getBotConfig() — раньше это
// приводило к тому, что токен ЧУЖОГО бота-агента (сохранённый через
// /api/bot/telegram-token) управлял логикой входа в личный кабинет.
const SERVICE_BOT_TOKEN = process.env.TELEGRAM_SERVICE_BOT_TOKEN || "";

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
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
  };
};

async function tgCall(token: string, method: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Простое in-memory состояние "владелец сейчас отвечает клиенту X".
// Для нескольких серверных инстансов лучше заменить на таблицу в Supabase,
// но для одного Next.js-процесса (Vercel serverless — тоже ок в рамках
// одного вызова с быстрым ответом владельца) этого достаточно как MVP.
const globalPending = globalThis as unknown as {
  __apexPendingReplies?: Map<number, { conversationId: string }>;
};
if (!globalPending.__apexPendingReplies) {
  globalPending.__apexPendingReplies = new Map();
}
const pendingReplies = globalPending.__apexPendingReplies;

async function handleOwnerCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const data = callback.data || "";
  const ownerId = callback.from.id;

  if (data.startsWith("reply:")) {
    const conversationId = data.split(":", 1)[1] ?? data.slice("reply:".length);
    pendingReplies.set(ownerId, { conversationId });
    await tgCall(SERVICE_BOT_TOKEN, "sendMessage", {
      chat_id: ownerId,
      text: "Введите ответ для клиента одним сообщением:",
    });
  }

  await tgCall(SERVICE_BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callback.id });
}

async function handleOwnerReplyText(ownerId: number, text: string) {
  const pending = pendingReplies.get(ownerId);
  if (!pending) return false;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[auth bot webhook] Supabase не настроен — эскалация на владельца недоступна");
    return true;
  }

  const supabase = createServiceClient();
  const { data: conv, error } = await supabase
    .from("conversations")
    .select("*, bots(*)")
    .eq("id", pending.conversationId)
    .single();

  if (error || !conv) {
    console.warn("[auth bot webhook] Диалог не найден:", error?.message);
    pendingReplies.delete(ownerId);
    return true;
  }

  const botRow = conv.bots as { bot_api_token: string } | null;
  if (botRow?.bot_api_token && conv.business_connection_id) {
    await tgCall(botRow.bot_api_token, "sendMessage", {
      business_connection_id: conv.business_connection_id,
      chat_id: conv.customer_chat_id,
      text,
    });
  }

  await supabase.from("messages").insert({
    conversation_id: pending.conversationId,
    role: "owner",
    content: text,
  });
  await supabase.from("conversations").update({ status: "human_takeover" }).eq("id", pending.conversationId);

  pendingReplies.delete(ownerId);
  await tgCall(SERVICE_BOT_TOKEN, "sendMessage", { chat_id: ownerId, text: "Ответ отправлен клиенту ✅" });
  return true;
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn("[auth bot webhook] Ошибка при отправке сообщения:", errorData);
    }
  } catch (err) {
    console.warn("[auth bot webhook] Не удалось отправить сообщение в Telegram:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const gotSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (gotSecret !== expectedSecret) {
        console.warn("[auth bot webhook] Неверный secret_token");
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    if (!SERVICE_BOT_TOKEN) {
      console.warn("[auth bot webhook] TELEGRAM_SERVICE_BOT_TOKEN не задан в .env");
      return NextResponse.json({ ok: true });
    }

    const update = (await req.json()) as TelegramUpdate;

    // Нажатие кнопки "Ответить" под уведомлением об эскалации
    if (update.callback_query) {
      await handleOwnerCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    if (!message?.text || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Если владелец сейчас в режиме "жду текст ответа клиенту" — это не
    // команда авторизации, а ответ на эскалированный диалог RAG-агента.
    const handledAsOwnerReply = await handleOwnerReplyText(message.from.id, text);
    if (handledAsOwnerReply) {
      return NextResponse.json({ ok: true });
    }

    // Deep-link из /login: /start auth_<sessionId>
    const startMatch = text.match(/^\/start(?:@\S+)?\s+auth_([a-zA-Z0-9]+)/);

    if (startMatch) {
      const sessionId = startMatch[1];
      const existingSession = await getTelegramSession(sessionId);

      if (!existingSession || existingSession.status === "expired") {
        await sendTelegramMessage(
          SERVICE_BOT_TOKEN,
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
        SERVICE_BOT_TOKEN,
        chatId,
        "Готово! Вход на сайте подтверждён — вернитесь на вкладку с сайтом, она обновится автоматически."
      );

      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Привет! Это бот для входа в личный кабинет. Чтобы авторизоваться, откройте сайт и нажмите «Перейти в Telegram-бота» на странице входа."
      );
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      "Это сервисный бот для входа в личный кабинет. Чтобы создать своего AI-агента для бизнеса — зайдите в личный кабинет → раздел «Telegram Business»."
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth bot webhook] error", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Auth bot webhook endpoint is alive" });
}
