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
  getPlanById,
  upsertPlan,
  deletePlan,
} from "@/lib/admin";

// ВАЖНО: это ЕДИНСТВЕННЫЙ вебхук сервисного бота (авторизация + админ-панель).
// У одного Telegram-бота может быть только ОДИН webhook URL, а сервисный
// бот отвечает за: (1) вход в личный кабинет по /start auth_xxx, (2)
// пересылку ответа владельца клиенту при эскалации диалога, (3) команды
// админ-панели (/admin, /broadcast, /setplan, /stats, /plans, управление
// тарифами) — доступны только Telegram ID из ADMIN_TELEGRAM_IDS.
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
  "/stats — количество зарегистрированных пользователей\n\n" +
  "<b>Тарифы</b> (изменения сразу видны на сайте и в личном кабинете):\n" +
  "/plans — список тарифов и их ID\n" +
  "/planinfo &lt;id&gt; — подробная карточка тарифа\n" +
  "/addplan &lt;id&gt; &lt;цена&gt; &lt;название&gt; — создать тариф\n" +
  "  пример: /addplan pro 5990 Профи\n" +
  "/editplan &lt;id&gt; &lt;поле&gt; &lt;значение&gt; — изменить тариф\n" +
  "  поля: name, price, description, messages, bots, highlight\n" +
  "  для messages/bots значение «-» означает безлимит\n" +
  "  highlight: 1 — выделить тариф на сайте, 0 — снять выделение\n" +
  "  примеры:\n" +
  "    /editplan business price 4990\n" +
  "    /editplan business description Для растущего бизнеса\n" +
  "    /editplan business messages -\n" +
  "/setfeatures &lt;id&gt; &lt;пункт1&gt;|&lt;пункт2&gt;|&lt;пункт3&gt; — список " +
  "возможностей тарифа (полностью заменяет старый)\n" +
  "  пример: /setfeatures start До 50 сообщений|1 бот|Базовая аналитика\n" +
  "/removeplan &lt;id&gt; — удалить тариф\n\n" +
  "<b>Подписки пользователей</b>:\n" +
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

  // --- Тарифы ---------------------------------------------------------

  if (command === "/plans") {
    const list = await formatPlansList();
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `<b>Тарифы:</b>\n${list}`, true);
    return true;
  }

  if (command === "/planinfo") {
    const planId = text.split(/\s+/)[1];
    if (!planId) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Использование: /planinfo <id>");
      return true;
    }
    const plan = await getPlanById(planId);
    if (!plan) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Тариф «${planId}» не найден`);
      return true;
    }
    const msgs = Number.isFinite(plan.messagesLimit) ? String(plan.messagesLimit) : "безлимит";
    const bots = Number.isFinite(plan.botsLimit) ? String(plan.botsLimit) : "безлимит";
    const featuresText = plan.features.length ? plan.features.map((f) => `• ${f}`).join("\n") : "—";
    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      `<b>${plan.name}</b> (<code>${plan.id}</code>)\n` +
        `Цена: ${plan.priceRub}₽/мес\n` +
        `Сообщений: ${msgs}\n` +
        `Ботов: ${bots}\n` +
        `Выделен на сайте: ${plan.highlighted ? "да" : "нет"}\n` +
        `Описание: ${plan.description || "—"}\n\n` +
        `Возможности:\n${featuresText}`,
      true
    );
    return true;
  }

  if (command === "/addplan") {
    const parts = text.split(/\s+/);
    const planId = parts[1];
    const price = parts[2] ? parseInt(parts[2], 10) : NaN;
    const name = parts.slice(3).join(" ").trim();

    if (!planId || Number.isNaN(price) || !name) {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Использование: /addplan <id> <цена> <название>\nПример: /addplan pro 5990 Профи"
      );
      return true;
    }

    const existing = await getPlanById(planId);
    if (existing) {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Тариф «${planId}» уже существует, используйте /editplan для изменения`
      );
      return true;
    }

    await upsertPlan({ id: planId, name, priceRub: price });
    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      `Тариф «${planId}» создан. Задайте лимиты и описание через /editplan, а возможности — через /setfeatures.`
    );
    return true;
  }

  if (command === "/editplan") {
    const parts = text.split(/\s+/);
    const planId = parts[1];
    const field = parts[2];
    const rawValue = parts.slice(3).join(" ").trim();

    if (!planId || !field) {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Использование: /editplan <id> <name|price|description|messages|bots|highlight> <значение>"
      );
      return true;
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Тариф «${planId}» не найден`);
      return true;
    }

    const patch: Parameters<typeof upsertPlan>[0] = { id: planId };

    switch (field) {
      case "name": {
        if (!rawValue) {
          await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Укажите новое название");
          return true;
        }
        patch.name = rawValue;
        break;
      }
      case "price": {
        const price = parseInt(rawValue, 10);
        if (Number.isNaN(price)) {
          await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Цена должна быть числом (в рублях)");
          return true;
        }
        patch.priceRub = price;
        break;
      }
      case "description": {
        patch.description = rawValue;
        break;
      }
      case "messages": {
        if (rawValue === "-") {
          patch.messagesLimit = Infinity;
        } else {
          const n = parseInt(rawValue, 10);
          if (Number.isNaN(n)) {
            await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Значение должно быть числом или «-» для безлимита");
            return true;
          }
          patch.messagesLimit = n;
        }
        break;
      }
      case "bots": {
        if (rawValue === "-") {
          patch.botsLimit = Infinity;
        } else {
          const n = parseInt(rawValue, 10);
          if (Number.isNaN(n)) {
            await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Значение должно быть числом или «-» для безлимита");
            return true;
          }
          patch.botsLimit = n;
        }
        break;
      }
      case "highlight": {
        patch.highlighted = rawValue === "1" || rawValue.toLowerCase() === "true";
        break;
      }
      default: {
        await sendTelegramMessage(
          SERVICE_BOT_TOKEN,
          chatId,
          "Неизвестное поле. Доступны: name, price, description, messages, bots, highlight"
        );
        return true;
      }
    }

    const updated = await upsertPlan(patch);
    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      `Тариф «${updated.id}» обновлён. Изменения уже видны на сайте и в личном кабинете.`
    );
    return true;
  }

  if (command === "/setfeatures") {
    const rest = text.replace(/^\/setfeatures(@\S+)?\s*/, "");
    const firstSpace = rest.indexOf(" ");
    const planId = (firstSpace === -1 ? rest : rest.slice(0, firstSpace)).trim();
    const featuresRaw = firstSpace === -1 ? "" : rest.slice(firstSpace + 1).trim();
    const features = featuresRaw
      .split("|")
      .map((f) => f.trim())
      .filter(Boolean);

    if (!planId || features.length === 0) {
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Использование: /setfeatures <id> <пункт1>|<пункт2>|<пункт3>"
      );
      return true;
    }

    const existing = await getPlanById(planId);
    if (!existing) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Тариф «${planId}» не найден`);
      return true;
    }

    await upsertPlan({ id: planId, features });
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Список возможностей тарифа «${planId}» обновлён.`);
    return true;
  }

  if (command === "/removeplan") {
    const planId = text.split(/\s+/)[1];
    if (!planId) {
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Использование: /removeplan <id>");
      return true;
    }
    const removed = await deletePlan(planId);
    await sendTelegramMessage(
      SERVICE_BOT_TOKEN,
      chatId,
      removed ? `Тариф «${planId}» удалён.` : `Тариф «${planId}» не найден.`
    );
    return true;
  }

  // --- Подписки пользователей ------------------------------------------

  if (command === "/setplan") {
    const parts = text.split(/\s+/).slice(1);
    const targetId = parseInt(parts[0], 10);
    const planId = parts[1];
    if (!targetId || !planId) {
      const list = await formatPlansList();
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Использование: /setplan &lt;telegram_id&gt; &lt;planId&gt;\n\n${list}`,
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
