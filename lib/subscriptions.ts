import { getBotByOwner, upsertBotForOwner, type UserBot } from "./bots";

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceRub: number;
  messagesLimit: number;
  botsLimit: number;
}

// Тарифы соответствуют секции "PRICING PLANS" на лендинге (app/page.tsx).
// Изменения тарифов делаются здесь и в разметке лендинга синхронно.
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "start", name: "Старт", priceRub: 1490, messagesLimit: 50, botsLimit: 1 },
  { id: "business", name: "Бизнес", priceRub: 3990, messagesLimit: 5000, botsLimit: 3 },
  { id: "enterprise", name: "Enterprise", priceRub: 8990, messagesLimit: Infinity, botsLimit: Infinity },
];

const MS_IN_MONTH = 30 * 24 * 60 * 60 * 1000;

export function getPlan(planId: string | null | undefined): SubscriptionPlan | null {
  if (!planId) return null;
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? null;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan | null;
  startedAt: string | null;
  expiresAt: string | null;
  status: "active" | "expired" | "none";
  msRemaining: number;
}

export function computeSubscriptionStatus(bot: UserBot | null): SubscriptionStatus {
  if (!bot || !bot.planId || !bot.subscriptionExpiresAt) {
    return { plan: null, startedAt: null, expiresAt: null, status: "none", msRemaining: 0 };
  }
  const plan = getPlan(bot.planId);
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
  const plan = getPlan(planId);
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
