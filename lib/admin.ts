import { createServiceClient } from "./supabase/server";
import { activateMonthlySubscription } from "./subscriptions";
import {
  getPlans,
  getPlanById,
  upsertPlan,
  deletePlan,
  type SubscriptionPlan,
} from "./plans";

function parseAdminIds(): number[] {
  return (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function isAdminTelegramId(telegramId: number): boolean {
  return parseAdminIds().includes(telegramId);
}

/**
 * Telegram ID администраторов сервиса (ADMIN_TELEGRAM_IDS из .env).
 * Используется, чтобы разослать уведомление только админам, а не всем
 * зарегистрированным пользователям (см. notifySupportRequest ниже).
 */
export function getAdminTelegramIds(): number[] {
  return parseAdminIds();
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface RegisteredUserRow {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
}

/**
 * Список всех зарегистрированных Telegram-пользователей сервиса
 * (таблица `profiles`, см. lib/telegram-registry.ts). Используется для
 * рассылок из админ-панели служебного бота.
 */
export async function listAllTelegramUsers(): Promise<RegisteredUserRow[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("telegram_id, username, first_name")
      .order("telegram_id", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("[admin] Не удалось получить список пользователей:", err);
    return [];
  }
}

async function tgSendMessage(token: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.warn("[admin] Ошибка отправки сообщения при рассылке:", err);
  }
}

export interface SupportRequestInput {
  name?: string;
  contact: string;
  message: string;
}

export interface SupportNotifyResult {
  delivered: boolean;
  admins: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Уведомление о новой заявке с публичного блока поддержки на сайте
 * (components/SupportContact.tsx). Уходит в служебный бот, но ТОЛЬКО
 * админам сервиса (ADMIN_TELEGRAM_IDS) — обычным зарегистрированным
 * пользователям (listAllTelegramUsers/broadcastToAllUsers) заявка не
 * рассылается, это разные адресаты.
 */
export async function notifySupportRequest(
  serviceBotToken: string,
  input: SupportRequestInput
): Promise<SupportNotifyResult> {
  const adminIds = getAdminTelegramIds();
  if (!serviceBotToken || adminIds.length === 0) {
    return { delivered: false, admins: adminIds.length };
  }

  const nameLine = input.name?.trim() ? escapeHtml(input.name.trim()) : "Не указано";
  const text =
    `📩 <b>Новая заявка с сайта (форма поддержки)</b>\n\n` +
    `<b>Имя:</b> ${nameLine}\n` +
    `<b>Контакт:</b> ${escapeHtml(input.contact.trim())}\n\n` +
    `<b>Сообщение:</b>\n${escapeHtml(input.message.trim())}`;

  for (const adminId of adminIds) {
    await tgSendMessage(serviceBotToken, adminId, text);
  }

  return { delivered: true, admins: adminIds.length };
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
}

/**
 * Массовая рассылка сообщения всем зарегистрированным пользователям сервиса
 * через служебный (авторизационный) Telegram-бот. Отправка с небольшой
 * задержкой, чтобы не упереться в rate-limit Telegram (~30 msg/сек).
 */
export async function broadcastToAllUsers(
  serviceBotToken: string,
  text: string
): Promise<BroadcastResult> {
  const users = await listAllTelegramUsers();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await tgSendMessage(serviceBotToken, user.telegram_id, text);
      sent++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return { total: users.length, sent, failed };
}

/**
 * Краткий список тарифов для команды /plans в админ-панели.
 * ИЗМЕНЕНО: раньше читал статический массив SUBSCRIPTION_PLANS, теперь —
 * динамические тарифы из lib/plans.ts (таблица `plans` в Supabase), которые
 * можно редактировать прямо из чата с сервисным ботом.
 */
export async function formatPlansList(): Promise<string> {
  const plans = await getPlans();
  if (plans.length === 0) return "Тарифов пока нет. Создайте первый: /addplan <id> <цена> <название>";
  return plans
    .map((p) => `• <code>${p.id}</code> — ${p.name}, ${p.priceRub}₽/мес${p.highlighted ? " ⭐" : ""}`)
    .join("\n");
}

// Обёртки над lib/plans.ts — используются в app/api/bot/webhook/route.ts
// командами /planinfo, /addplan, /editplan, /setfeatures, /removeplan.
export { getPlans, getPlanById, upsertPlan, deletePlan };
export type { SubscriptionPlan };

export { activateMonthlySubscription };
