import { getBotByOwner, upsertBotForOwner, type UserBot } from "./bots";
import { getPlans, getPlanById, DEFAULT_PLANS, type SubscriptionPlan } from "./plans";

export type { SubscriptionPlan };
export { DEFAULT_PLANS as SUBSCRIPTION_PLANS };

// Тарифы хранятся в lib/plans.ts (таблица `plans`) и редактируются из
// админ-панели служебного бота.
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
 * Активирует/продлевает ежемесячную (30 дней) подписку. Если подписка ещё
 * активна — продлевает от даты окончания, иначе от «сейчас». При новой
 * активации (подписки не было или она истекла) счётчик ответов ИИ
 * обнуляется — оплаченный месяц начинается с нуля.
 */
export async function activateMonthlySubscription(ownerId: string, planId: string): Promise<UserBot> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error(`Неизвестный тариф: ${planId}`);

  const existing = await getBotByOwner(ownerId);
  const now = Date.now();
  const wasActive = Boolean(
    existing?.subscriptionExpiresAt && new Date(existing.subscriptionExpiresAt).getTime() > now
  );
  const base = wasActive ? new Date(existing!.subscriptionExpiresAt!).getTime() : now;

  const expiresAt = new Date(base + MS_IN_MONTH).toISOString();
  const startedAt = wasActive && existing?.subscriptionStartedAt
    ? existing.subscriptionStartedAt
    : new Date(now).toISOString();

  return upsertBotForOwner(ownerId, {
    planId: plan.id,
    subscriptionStartedAt: startedAt,
    subscriptionExpiresAt: expiresAt,
    ...(wasActive ? {} : { aiRepliesUsed: 0, aiRepliesPeriodStart: new Date(now).toISOString() }),
  });
}
