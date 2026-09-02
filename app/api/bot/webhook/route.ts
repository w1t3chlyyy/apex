import { NextRequest, NextResponse } from "next/server";
import { confirmTelegramSession, getTelegramSession } from "@/lib/session-store";
import { registerTelegramUser } from "@/lib/telegram-registry";
import { createServiceClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/auth";
import {
  isAdminTelegramId,
  broadcastToAllUsers,
  listAllTelegramUsers,
  formatPlansList,
  activateMonthlySubscription,
} from "@/lib/admin";

// ВАЖНО: это ЕДИНСТВЕННЫЙ вебхук сервисного бота (авторизация + админ-панель).
// У одного Telegram-бота может быть только ОДИН webhook URL, а сервисный
// бот отвечает за: (1) вход в личный кабинет по /start auth_xxx, (2)
// пересылку ответа владельца клиенту при эскалации диалога, и (3) команды
// админ-панели (/admin, /broadcast, /setplan, /stats, /plans) — доступны
// только Telegram ID из ADMIN_TELEGRAM_IDS.
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
    // Раньше здесь ошибочно вызывался data.split(":", 1)[1], который с
    // limit=1 всегда возвращает undefined — реально работало только
    // благодаря fallback на data.slice(...). Убрали лишний/некорректный код.
    const conversationId = data.slice("reply:".length);
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

async function sendTelegramMessage(token: string, chatId: number, text: string, html = false) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(html ? { parse_mode: "HTML" } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn("[auth bot webhook] Ошибка при отправке сообщения:", errorData);
    }
  } catch (err) {
    console.warn("[auth bot webhook] Не удалось отправить сообщение в Telegram:", err);
  }
}

// ---------------------------------------------------------------------------
// АДМИН-ПАНЕЛЬ (доступна только Telegram ID из ADMIN_TELEGRAM_IDS в .env)
// ---------------------------------------------------------------------------

const ADMIN_HELP =
  "<b>Админ-панель Apex</b>\n\n" +
  "/admin — это меню\n" +
  "/broadcast &lt;текст&gt; — рассылка всем пользователям сайта\n" +
  "/stats — количество зарегистрированных пользователей\n" +
  "/plans — список тарифов и их ID\n" +
  "/setplan &lt;telegram_id&gt; &lt;planId&gt; — активировать/продлить тариф на 30 дней\n";

async function handleAdminCommand(fromId: number, chatId: number, text: string): Promise<boolean> {
  if (!isAdminTelegramId(fromId)) return false;

  const command = text.split(/\s+/)[0];

  if (command === "/admin") {
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, ADMIN_HELP, true);
    return true;
  }

  if (command === "/broadcast") {
    const message = text.replace(/^\/broadcast(@\S+)?\s*/, "").trim();
    if (!message) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Использование: /broadcast <текст сообщения>");
      return true;
    }
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Рассылка запущена, это может занять некоторое время…");
    const result = await broadcastToAllUsers(SERVICE_BOT_TOKEN, message);
    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      `Рассылка завершена.\nВсего пользователей: ${result.total}\nОтправлено: ${result.sent}\nОшибок: ${result.failed}`
    );
    return true;
  }

  if (command === "/stats") {
    const users = await listAllTelegramUsers();
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Зарегистрировано пользователей: ${users.length}`);
    return true;
  }

  if (command === "/plans") {
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `<b>Доступные тарифы:</b>\n${formatPlansList()}`, true);
    return true;
  }

  if (command === "/setplan") {
    const parts = text.split(/\s+/).slice(1);
    const targetId = parseInt(parts[0], 10);
    const planId = parts[1];
    if (!targetId || !planId) {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Использование: /setplan &lt;telegram_id&gt; &lt;planId&gt;\n\n${formatPlansList()}`,
        true
      );
      return true;
    }
    try {
      const bot = await activateMonthlySubscription(`tg_${targetId}`, planId);
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Тариф «${planId}» активирован для tg_${targetId} до ${bot.subscriptionExpiresAt}`
      );
    } catch (err) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Ошибка: ${(err as Error).message}`);
    }
    return true;
  }

  return false;
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

    // Команды админ-панели проверяются в первую очередь: если отправитель
    // не в ADMIN_TELEGRAM_IDS, handleAdminCommand просто вернёт false и
    // обработка пойдёт дальше по обычному сценарию (владелец/логин).
    if (text.startsWith("/")) {
      const handledAsAdmin = await handleAdminCommand(message.from.id, chatId, text);
      if (handledAsAdmin) return NextResponse.json({ ok: true });
    }

    const handledAsOwnerReply = await handleOwnerReplyText(message.from.id, text);
    if (handledAsOwnerReply) {
      return NextResponse.json({ ok: true });
    }

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
