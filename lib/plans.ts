import { createServiceClient } from "./supabase/server";

/**
 * Тариф подписки. Источник истины — таблица `plans` в Supabase,
 * редактируется из админ-панели служебного бота (/setfeatures, /editplan...).
 *
 * Дефолтные тарифы ниже описывают ТОЛЬКО то, что реально работает:
 * лимит ответов ИИ в месяц (считает main.py), 1 бот на аккаунт, база знаний
 * RAG, эскалация на оператора, базовая аналитика в кабинете.
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  priceRub: number;
  messagesLimit: number; // Infinity = безлимит (лимит ответов ИИ за 30 дней)
  botsLimit: number; // сейчас везде 1: один бот на аккаунт
  description: string;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "start",
    name: "Старт",
    priceRub: 1490,
    messagesLimit: 50,
    botsLimit: 1,
    description: "Для небольших проектов",
    features: [
      "До 50 ответов ИИ в месяц",
      "1 Telegram Business бот",
      "База знаний (RAG)",
      "Эскалация на оператора",
      "Базовая аналитика в кабинете",
    ],
    highlighted: false,
    sortOrder: 1,
  },
  {
    id: "business",
    name: "Бизнес",
    priceRub: 3990,
    messagesLimit: 5000,
    botsLimit: 1,
    description: "Для растущих продаж и сервиса",
    features: [
      "До 5 000 ответов ИИ в месяц",
      "1 Telegram Business бот",
      "База знаний (RAG)",
      "Эскалация на оператора",
      "Базовая аналитика в кабинете",
      "Приоритетная поддержка в Telegram",
    ],
    highlighted: true,
    sortOrder: 2,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceRub: 8990,
    messagesLimit: Infinity,
    botsLimit: 1,
    description: "Для компаний с большим потоком обращений",
    features: [
      "Без лимита на ответы ИИ",
      "1 Telegram Business бот",
      "База знаний (RAG)",
      "Эскалация на оператора",
      "Базовая аналитика в кабинете",
      "Приоритетная поддержка в Telegram",
    ],
    highlighted: false,
    sortOrder: 3,
  },
];

const globalStore = globalThis as unknown as { __apexPlans?: Map<string, SubscriptionPlan> };
if (!globalStore.__apexPlans) {
  globalStore.__apexPlans = new Map(DEFAULT_PLANS.map((p) => [p.id, p]));
}
const memoryPlans = globalStore.__apexPlans;

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

interface PlanRow {
  id: string;
  name: string;
  price_rub: number;
  messages_limit: number | null; // null = безлимит
  bots_limit: number | null; // null = безлимит
  description: string | null;
  features: string[] | null;
  highlighted: boolean | null;
  sort_order: number | null;
}

function rowToPlan(row: PlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    priceRub: row.price_rub,
    messagesLimit: row.messages_limit ?? Infinity,
    botsLimit: row.bots_limit ?? Infinity,
    description: row.description ?? "",
    features: row.features ?? [],
    highlighted: Boolean(row.highlighted),
    sortOrder: row.sort_order ?? 0,
  };
}

function planToRow(plan: SubscriptionPlan): PlanRow {
  return {
    id: plan.id,
    name: plan.name,
    price_rub: plan.priceRub,
    messages_limit: Number.isFinite(plan.messagesLimit) ? plan.messagesLimit : null,
    bots_limit: Number.isFinite(plan.botsLimit) ? plan.botsLimit : null,
    description: plan.description,
    features: plan.features,
    highlighted: plan.highlighted,
    sort_order: plan.sortOrder,
  };
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  if (supabaseConfigured()) {
    try {
      const { data, error } = await createServiceClient()
        .from("plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (!error && data && data.length > 0) {
        return (data as PlanRow[]).map(rowToPlan);
      }
    } catch (err) {
      console.warn("[plans] Supabase lookup failed, falling back to memory:", err);
    }
  }
  return Array.from(memoryPlans.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const plans = await getPlans();
  return plans.find((p) => p.id === planId) ?? null;
}

export async function upsertPlan(
  patch: Partial<Omit<SubscriptionPlan, "id">> & { id: string }
): Promise<SubscriptionPlan> {
  const existing = (await getPlanById(patch.id)) ?? undefined;
  const currentPlans = await getPlans();
  const maxSort = currentPlans.reduce((m, p) => Math.max(m, p.sortOrder), 0);

  const next: SubscriptionPlan = {
    id: patch.id,
    name: patch.name ?? existing?.name ?? patch.id,
    priceRub: patch.priceRub ?? existing?.priceRub ?? 0,
    messagesLimit: patch.messagesLimit ?? existing?.messagesLimit ?? 0,
    botsLimit: patch.botsLimit ?? existing?.botsLimit ?? 1,
    description: patch.description ?? existing?.description ?? "",
    features: patch.features ?? existing?.features ?? [],
    highlighted: patch.highlighted ?? existing?.highlighted ?? false,
    sortOrder: patch.sortOrder ?? existing?.sortOrder ?? maxSort + 1,
  };

  memoryPlans.set(next.id, next);

  if (supabaseConfigured()) {
    try {
      const { error } = await createServiceClient().from("plans").upsert(planToRow(next), { onConflict: "id" });
      if (error) console.warn("[plans] Supabase upsert error:", error.message);
    } catch (err) {
      console.warn("[plans] Supabase upsert failed, using in-memory only:", err);
    }
  }

  return next;
}

export async function deletePlan(planId: string): Promise<boolean> {
  const existed = memoryPlans.delete(planId);

  if (supabaseConfigured()) {
    try {
      await createServiceClient().from("plans").delete().eq("id", planId);
    } catch (err) {
      console.warn("[plans] Supabase delete failed:", err);
    }
  }

  return existed;
}
