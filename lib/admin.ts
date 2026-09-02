import { createServiceClient } from "./supabase/server";
import { SUBSCRIPTION_PLANS, activateMonthlySubscription } from "./subscriptions";

function parseAdminIds(): number[] {
  return (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function isAdminTelegramId(telegramId: number): boolean {
  return parseAdminIds().includes(telegramId);
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

export function formatPlansList(): string {
  return SUBSCRIPTION_PLANS.map(
    (p) => `• <code>${p.id}</code> — ${p.name}, ${p.priceRub}₽/мес`
  ).join("\n");
}

export { activateMonthlySubscription };
