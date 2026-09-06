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
  getPlans,
  getPlanById,
  upsertPlan,
  deletePlan,
  type SubscriptionPlan,
} from "@/lib/admin";

// ВАЖНО: это ЕДИНСТВЕННЫЙ вебхук сервисного бота (авторизация + админ-панель).
// У одного Telegram-бота может быть только ОДИН webhook URL, а сервисный
// бот отвечает за: (1) вход в личный кабинет по /start auth_xxx, (2)
// пересылку ответа владельца клиенту при эскалации диалога, (3) админ-панель
// (доступна только Telegram ID из ADMIN_TELEGRAM_IDS) — теперь в первую
// очередь через инлайн-кнопки (/admin открывает меню), а текстовые команды
// (/broadcast, /addplan, /editplan и т.д.) остаются рабочими как запасной
// вариант для тех, кто предпочитает печатать команды руками.
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
    message?: { message_id: number };
  };
};

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
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

// ---------------------------------------------------------------------------
// Состояние "многошаговых" сценариев админ-панели (ожидание текстового
// ввода после нажатия инлайн-кнопки, например "введите новую цену").
// Ключ — telegram_id администратора (в приватном чате с ботом это же
// значение, что и chat_id).
// ---------------------------------------------------------------------------

type AdminPendingAction =
  | { type: "broadcast" }
  | { type: "add_plan_id" }
  | { type: "add_plan_price"; id: string }
  | { type: "add_plan_name"; id: string; price: number }
  | {
      type: "edit_field";
      planId: string;
      field: "name" | "price" | "description" | "messages" | "bots";
    }
  | { type: "set_features"; planId: string }
  | { type: "setplan_id" };

const globalAdminPending = globalThis as unknown as {
  __apexAdminPendingActions?: Map<number, AdminPendingAction>;
};
if (!globalAdminPending.__apexAdminPendingActions) {
  globalAdminPending.__apexAdminPendingActions = new Map();
}
const pendingAdminActions = globalAdminPending.__apexAdminPendingActions;

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

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  html = false,
  replyMarkup?: InlineKeyboard
) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(html ? { parse_mode: "HTML" } : {}),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
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

// Пытается отредактировать существующее сообщение (чтобы навигация по меню
// не заваливала чат новыми сообщениями), а если это невозможно (например,
// сообщение слишком старое или его текст не изменился) — просто шлёт новое.
async function editOrSend(
  chatId: number,
  messageId: number | undefined,
  text: string,
  keyboard: InlineKeyboard
) {
  if (messageId) {
    const res = await tgCall(SERVICE_BOT_TOKEN, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    if (res?.ok) return;
  }
  await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, text, true, keyboard);
}

// ---------------------------------------------------------------------------
// Инлайн-клавиатуры админ-панели
// ---------------------------------------------------------------------------

const ADMIN_MENU_TEXT = "🛠 <b>Админ-панель</b>\n\nВыберите действие:";

function mainMenuKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "📋 Тарифы", callback_data: "adm:plans" },
        { text: "➕ Новый тариф", callback_data: "adm:addplan" },
      ],
      [{ text: "🎟 Выдать тариф пользователю", callback_data: "adm:setplan" }],
      [
        { text: "📊 Статистика", callback_data: "adm:stats" },
        { text: "📢 Рассылка", callback_data: "adm:broadcast" },
      ],
      [{ text: "❓ Справка по командам", callback_data: "adm:help" }],
    ],
  };
}

function backToMenuKeyboard(): InlineKeyboard {
  return { inline_keyboard: [[{ text: "⬅️ В меню", callback_data: "adm:menu" }]] };
}

function plansListKeyboard(plans: SubscriptionPlan[]): InlineKeyboard {
  const rows = plans.map((p) => [
    { text: `${p.highlighted ? "⭐ " : ""}${p.name} — ${p.priceRub}₽`, callback_data: `adm:plan:${p.id}` },
  ]);
  rows.push([{ text: "➕ Новый тариф", callback_data: "adm:addplan" }]);
  rows.push([{ text: "⬅️ В меню", callback_data: "adm:menu" }]);
  return { inline_keyboard: rows };
}

function planDetailKeyboard(plan: SubscriptionPlan): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "✏️ Изменить поле", callback_data: `adm:field:${plan.id}` }],
      [{ text: "📝 Список возможностей", callback_data: `adm:feat:${plan.id}` }],
      [
        {
          text: plan.highlighted ? "☆ Снять выделение на сайте" : "⭐ Выделить на сайте",
          callback_data: `adm:hl:${plan.id}`,
        },
      ],
      [{ text: "🗑 Удалить тариф", callback_data: `adm:del:${plan.id}` }],
      [{ text: "⬅️ К списку тарифов", callback_data: "adm:plans" }],
    ],
  };
}

function fieldChoiceKeyboard(planId: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "Название", callback_data: `adm:ef:${planId}:name` },
        { text: "Цена", callback_data: `adm:ef:${planId}:price` },
      ],
      [{ text: "Описание", callback_data: `adm:ef:${planId}:description` }],
      [
        { text: "Лимит сообщений", callback_data: `adm:ef:${planId}:messages` },
        { text: "Лимит ботов", callback_data: `adm:ef:${planId}:bots` },
      ],
      [{ text: "⬅️ Назад к тарифу", callback_data: `adm:plan:${planId}` }],
    ],
  };
}

function confirmDeleteKeyboard(planId: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "✅ Да, удалить", callback_data: `adm:delyes:${planId}` },
        { text: "Отмена", callback_data: `adm:delno:${planId}` },
      ],
    ],
  };
}

function planPickerKeyboard(plans: SubscriptionPlan[], targetTelegramId: number): InlineKeyboard {
  const rows = plans.map((p) => [
    { text: `${p.name} — ${p.priceRub}₽`, callback_data: `adm:spgo:${targetTelegramId}:${p.id}` },
  ]);
  rows.push([{ text: "⬅️ В меню", callback_data: "adm:menu" }]);
  return { inline_keyboard: rows };
}

function planDetailText(plan: SubscriptionPlan): string {
  const msgs = Number.isFinite(plan.messagesLimit) ? String(plan.messagesLimit) : "безлимит";
  const bots = Number.isFinite(plan.botsLimit) ? String(plan.botsLimit) : "безлимит";
  const featuresText = plan.features.length ? plan.features.map((f) => `• ${f}`).join("\n") : "—";
  return (
    `<b>${plan.name}</b> (<code>${plan.id}</code>)${plan.highlighted ? " ⭐" : ""}\n` +
    `Цена: <b>${plan.priceRub}₽/мес</b>\n` +
    `Сообщений: ${msgs}\n` +
    `Ботов: ${bots}\n` +
    `Описание: ${plan.description || "—"}\n\n` +
    `Возможности:\n${featuresText}\n\n` +
    `Изменения сразу видны на сайте и в личном кабинете.`
  );
}

async function sendOrEditPlanDetail(chatId: number, messageId: number | undefined, planId: string) {
  const plan = await getPlanById(planId);
  if (!plan) {
    await editOrSend(chatId, messageId, `Тариф «${planId}» не найден.`, backToMenuKeyboard());
    return;
  }
  await editOrSend(chatId, messageId, planDetailText(plan), planDetailKeyboard(plan));
}

// Аналог sendOrEditPlanDetail, но всегда шлёт новое сообщение — используется
// после завершения текстового шага сценария (когда нет message_id кнопки,
// на которую можно ответить editMessageText).
async function sendPlanDetail(chatId: number, planId: string) {
  const plan = await getPlanById(planId);
  if (!plan) return;
  await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, planDetailText(plan), true, planDetailKeyboard(plan));
}

const EDIT_FIELD_PROMPTS: Record<string, string> = {
  name: "Введите новое название тарифа:",
  price: "Введите новую цену в рублях (только число):",
  description: "Введите новое описание тарифа:",
  messages: "Введите лимит сообщений в месяц (число или «-» для безлимита):",
  bots: "Введите лимит ботов (число или «-» для безлимита):",
};

// ---------------------------------------------------------------------------
// Обработка нажатий инлайн-кнопок админ-панели (callback_data вида "adm:...")
// ---------------------------------------------------------------------------

async function handleAdminCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const data = callback.data || "";
  const chatId = callback.from.id; // приватный чат с ботом: chat_id === telegram_id
  const messageId = callback.message?.message_id;
  const parts = data.split(":");
  const action = parts[1];

  try {
    if (action === "menu") {
      await editOrSend(chatId, messageId, ADMIN_MENU_TEXT, mainMenuKeyboard());
    } else if (action === "plans") {
      const plans = await getPlans();
      await editOrSend(
        chatId,
        messageId,
        "📋 <b>Тарифы</b>\n\nВыберите тариф, чтобы посмотреть детали и отредактировать:",
        plansListKeyboard(plans)
      );
    } else if (action === "plan") {
      await sendOrEditPlanDetail(chatId, messageId, parts[2]);
    } else if (action === "field") {
      const planId = parts[2];
      await editOrSend(chatId, messageId, "Что именно изменить?", fieldChoiceKeyboard(planId));
    } else if (action === "ef") {
      const planId = parts[2];
      const field = parts[3] as "name" | "price" | "description" | "messages" | "bots";
      pendingAdminActions.set(chatId, { type: "edit_field", planId, field });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `${EDIT_FIELD_PROMPTS[field] || "Введите новое значение:"}\n\n(или /cancel для отмены)`
      );
    } else if (action === "feat") {
      const planId = parts[2];
      pendingAdminActions.set(chatId, { type: "set_features", planId });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Отправьте список возможностей тарифа — каждый пункт с новой строки. Полностью заменит текущий список.\n\n(или /cancel для отмены)"
      );
    } else if (action === "hl") {
      const planId = parts[2];
      const plan = await getPlanById(planId);
      if (plan) {
        await upsertPlan({ id: planId, highlighted: !plan.highlighted });
      }
      await sendOrEditPlanDetail(chatId, messageId, planId);
    } else if (action === "del") {
      const planId = parts[2];
      await editOrSend(
        chatId,
        messageId,
        `Удалить тариф «${planId}»? Это действие необратимо.`,
        confirmDeleteKeyboard(planId)
      );
    } else if (action === "delyes") {
      const planId = parts[2];
      await deletePlan(planId);
      const plans = await getPlans();
      await editOrSend(chatId, messageId, `Тариф «${planId}» удалён ✅`, plansListKeyboard(plans));
    } else if (action === "delno") {
      await sendOrEditPlanDetail(chatId, messageId, parts[2]);
    } else if (action === "addplan") {
      pendingAdminActions.set(chatId, { type: "add_plan_id" });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Введите ID нового тарифа — латиницей, без пробелов (например: pro).\n\n(или /cancel для отмены)"
      );
    } else if (action === "broadcast") {
      pendingAdminActions.set(chatId, { type: "broadcast" });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Отправьте текст рассылки одним сообщением — он уйдёт всем зарегистрированным пользователям.\n\n(или /cancel для отмены)"
      );
    } else if (action === "stats") {
      const users = await listAllTelegramUsers();
      await editOrSend(
        chatId,
        messageId,
        `📊 <b>Статистика</b>\n\nЗарегистрировано пользователей: <b>${users.length}</b>`,
        backToMenuKeyboard()
      );
    } else if (action === "setplan") {
      pendingAdminActions.set(chatId, { type: "setplan_id" });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        "Введите Telegram ID пользователя, которому хотите выдать/продлить тариф:\n\n(или /cancel для отмены)"
      );
    } else if (action === "spgo") {
      const targetId = parseInt(parts[2], 10);
      const planId = parts[3];
      try {
        const bot = await activateMonthlySubscription(`tg_${targetId}`, planId);
        await editOrSend(
          chatId,
          messageId,
          `Тариф «${planId}» активирован для tg_${targetId} до ${bot.subscriptionExpiresAt} ✅`,
          backToMenuKeyboard()
        );
      } catch (err) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Ошибка: ${(err as Error).message}`);
      }
    } else if (action === "help") {
      await editOrSend(chatId, messageId, ADMIN_HELP, backToMenuKeyboard());
    }
  } catch (err) {
    console.error("[admin callback] error", err);
  }

  await tgCall(SERVICE_BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callback.id });
}

// Обрабатывает текстовый ввод, когда у администратора есть незавершённый
// сценарий (после нажатия кнопки, ожидающей значение). Возвращает true,
// если сообщение было "поглощено" этим сценарием.
async function handleAdminPendingText(fromId: number, chatId: number, text: string): Promise<boolean> {
  if (!isAdminTelegramId(fromId)) return false;
  const pending = pendingAdminActions.get(fromId);
  if (!pending) return false;

  if (text.trim() === "/cancel") {
    pendingAdminActions.delete(fromId);
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Действие отменено.", false, backToMenuKeyboard());
    return true;
  }

  switch (pending.type) {
    case "broadcast": {
      pendingAdminActions.delete(fromId);
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Рассылка запущена, это может занять некоторое время…");
      const result = await broadcastToAllUsers(SERVICE_BOT_TOKEN, text);
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Рассылка завершена.\nВсего пользователей: ${result.total}\nОтправлено: ${result.sent}\nОшибок: ${result.failed}`,
        false,
        backToMenuKeyboard()
      );
      return true;
    }

    case "add_plan_id": {
      const id = text.trim().toLowerCase().replace(/\s+/g, "_");
      if (!id) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "ID не может быть пустым. Введите ID тарифа:");
        return true;
      }
      const existing = await getPlanById(id);
      if (existing) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Тариф «${id}» уже существует. Введите другой ID:`);
        return true;
      }
      pendingAdminActions.set(fromId, { type: "add_plan_price", id });
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Введите цену тарифа в рублях (число):");
      return true;
    }

    case "add_plan_price": {
      const price = parseInt(text.trim(), 10);
      if (Number.isNaN(price)) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Цена должна быть числом. Попробуйте снова:");
        return true;
      }
      pendingAdminActions.set(fromId, { type: "add_plan_name", id: pending.id, price });
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Введите название тарифа:");
      return true;
    }

    case "add_plan_name": {
      const name = text.trim();
      if (!name) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Название не может быть пустым. Введите название:");
        return true;
      }
      pendingAdminActions.delete(fromId);
      const plan = await upsertPlan({ id: pending.id, name, priceRub: pending.price });
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Тариф «${plan.name}» создан ✅ Теперь задайте описание, лимиты и возможности через карточку тарифа ниже.`
      );
      await sendPlanDetail(chatId, plan.id);
      return true;
    }

    case "edit_field": {
      const raw = text.trim();
      const patch: Parameters<typeof upsertPlan>[0] = { id: pending.planId };

      if (pending.field === "name") {
        patch.name = raw;
      } else if (pending.field === "price") {
        const v = parseInt(raw, 10);
        if (Number.isNaN(v)) {
          await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Цена должна быть числом. Попробуйте снова:");
          return true;
        }
        patch.priceRub = v;
      } else if (pending.field === "description") {
        patch.description = raw;
      } else if (pending.field === "messages") {
        if (raw === "-") {
          patch.messagesLimit = Infinity;
        } else {
          const n = parseInt(raw, 10);
          if (Number.isNaN(n)) {
            await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Введите число или «-» для безлимита:");
            return true;
          }
          patch.messagesLimit = n;
        }
      } else if (pending.field === "bots") {
        if (raw === "-") {
          patch.botsLimit = Infinity;
        } else {
          const n = parseInt(raw, 10);
          if (Number.isNaN(n)) {
            await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Введите число или «-» для безлимита:");
            return true;
          }
          patch.botsLimit = n;
        }
      }

      pendingAdminActions.delete(fromId);
      const updated = await upsertPlan(patch);
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Готово ✅ Тариф «${updated.name}» обновлён.`);
      await sendPlanDetail(chatId, updated.id);
      return true;
    }

    case "set_features": {
      const features = text
        .split("\n")
        .map((f) => f.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
      if (features.length === 0) {
        await sendTelegramMessage(
          SERVICE_BOT_TOKEN,
          chatId,
          "Список пуст. Отправьте хотя бы один пункт (каждый с новой строки):"
        );
        return true;
      }
      pendingAdminActions.delete(fromId);
      const updated = await upsertPlan({ id: pending.planId, features });
      await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, `Возможности тарифа «${updated.name}» обновлены ✅`);
      await sendPlanDetail(chatId, updated.id);
      return true;
    }

    case "setplan_id": {
      const targetId = parseInt(text.trim(), 10);
      if (!targetId) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Введите корректный Telegram ID (число):");
        return true;
      }
      pendingAdminActions.delete(fromId);
      const plans = await getPlans();
      if (plans.length === 0) {
        await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, "Сначала создайте хотя бы один тариф.", false, backToMenuKeyboard());
        return true;
      }
      await sendTelegramMessage(
        SERVICE_BOT_TOKEN,
        chatId,
        `Выберите тариф для пользователя tg_${targetId}:`,
        false,
        planPickerKeyboard(plans, targetId)
      );
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// АДМИН-ПАНЕЛЬ: текстовые команды (доступны только Telegram ID из
// ADMIN_TELEGRAM_IDS в .env). /admin теперь открывает инлайн-меню; все
// остальные команды остаются рабочими для тех, кто предпочитает их
// набирать вручную.
// ---------------------------------------------------------------------------

const ADMIN_HELP =
  "<b>Текстовые команды (запасной вариант)</b>\n\n" +
  "Проще пользоваться кнопками из /admin — они делают то же самое без " +
  "запоминания синтаксиса. Но команды тоже работают:\n\n" +
  "/admin — открыть меню с кнопками\n" +
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
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, ADMIN_MENU_TEXT, true, mainMenuKeyboard());
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
    await sendTelegramMessage(SERVICE_BOT_TOKEN, chatId, planDetailText(plan), true, planDetailKeyboard(plan));
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
      const data = update.callback_query.data || "";
      if (data.startsWith("adm:") && isAdminTelegramId(update.callback_query.from.id)) {
        await handleAdminCallback(update.callback_query);
      } else {
        await handleOwnerCallback(update.callback_query);
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    if (!message?.text || !message.from) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Команды (начинающиеся с "/") всегда прерывают любой незавершённый
    // сценарий админ-панели — иначе, например, "/admin" посреди ввода цены
    // тарифа было бы воспринято как значение цены.
    if (text.startsWith("/")) {
      pendingAdminActions.delete(message.from.id);
      const handledAsAdmin = await handleAdminCommand(message.from.id, chatId, text);
      if (handledAsAdmin) return NextResponse.json({ ok: true });
    } else {
      const handledAsAdminFlow = await handleAdminPendingText(message.from.id, chatId, text);
      if (handledAsAdminFlow) return NextResponse.json({ ok: true });
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
