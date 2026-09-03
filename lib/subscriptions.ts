import { getBotByOwner, upsertBotForOwner, type UserBot } from "./bots";
import { getPlans, getPlanById, type SubscriptionPlan } from "./plans";

export type { SubscriptionPlan };

// ИЗМЕНЕНО: раньше тарифы были захардкожены в константе SUBSCRIPTION_PLANS
// и синхронизировались с разметкой лендинга вручную (см. старый комментарий
// ниже). Теперь тарифы хранятся в lib/plans.ts (таблица `plans` в Supabase)
// и редактируются из админ-панели служебного бота — изменения сразу видны
// и на лендинге (через /api/plans), и в личном кабинете
// (через /api/bot/subscription).
export const getSubscriptionPlans = getPlans;

const MS_IN_MONTH = 30 * 24 * 60 * 60 * 1000;

export async function getPlan(planId: string | null | undefined): Promise<SubscriptionPlan | null> {
  if (!planId) return null;
  return getPlanById(planId);
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan | null;
  startedAt: string | null;
  expiresAt: string | null;
  status: "active" | "expired" | "none";
  msRemaining: number;
}

export async function computeSubscriptionStatus(bot: UserBot | null): Promise<SubscriptionStatus> {
  if (!bot || !bot.planId || !bot.subscriptionExpiresAt) {
    return { plan: null, startedAt: null, expiresAt: null, status: "none", msRemaining: 0 };
  }
  const plan = await getPlan(bot.planId);
  const expiresAt = new Date(bot.subscriptionExpiresAt).getTime();
  const msRemaining = expiresAt - Date.now();
  return {
    plan,
    startedAt: bot.subscriptionStartedAt,
    expiresAt: bot.subscriptionExpiresAt,
    status: msRemaining > 0 ? "active" : "expired",
    msRemaining: Math.max(0, msRemaining),
  };
}

/**
 * Активирует/продлевает ежемесячную (30 дней) подписку для владельца бота.
 * Если подписка ещё активна — продлевает от текущей даты окончания (не от
 * "сейчас"), иначе — от текущего момента. Используется и из /dashboard/billing
 * (после подтверждения оплаты вручную), и из админ-панели служебного бота
 * (/setplan) — единая точка изменения подписки, чтобы логика не расходилась.
 */
export async function activateMonthlySubscription(
  ownerId: string,
  planId: string
): Promise<UserBot> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error(`Неизвестный тариф: ${planId}`);

  const existing = await getBotByOwner(ownerId);
  const now = Date.now();
  const base =
    existing?.subscriptionExpiresAt && new Date(existing.subscriptionExpiresAt).getTime() > now
      ? new Date(existing.subscriptionExpiresAt).getTime()
      : now;

  const expiresAt = new Date(base + MS_IN_MONTH).toISOString();
  const startedAt = existing?.subscriptionStartedAt ?? new Date(now).toISOString();

  return upsertBotForOwner(ownerId, {
    planId: plan.id,
    subscriptionStartedAt: startedAt,
    subscriptionExpiresAt: expiresAt,
  });
}
