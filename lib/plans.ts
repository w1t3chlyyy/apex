import { createServiceClient } from "./supabase/server";

/**
 * Тариф подписки. Источник истины — таблица `plans` в Supabase
 * (см. lib/supabase/schema-plans.sql). Редактируется владельцем через
 * админ-панель служебного бота командами /addplan, /editplan, /setfeatures,
 * /removeplan (см. lib/admin.ts, app/api/bot/webhook/route.ts).
 *
 * Изменения сразу видны:
 * - на лендинге (app/page.tsx, через публичный /api/plans),
 * - в личном кабинете (app/dashboard/billing/page.tsx, через /api/bot/subscription).
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  priceRub: number;
  messagesLimit: number; // Infinity = безлимит
  botsLimit: number; // Infinity = безлимит
  description: string;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
}

// Дефолтные тарифы — используются, если Supabase не настроен или таблица
// `plans` ещё пуста (первый запуск до применения миграции/наполнения).
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "start",
    name: "Старт",
    priceRub: 1490,
    messagesLimit: 50,
    botsLimit: 1,
    description: "Для небольших проектов",
    features: [
      "До 50 сообщений в месяц",
      "1 Telegram Business бот",
      "База знаний до 50 статей",
      "Базовая аналитика",
    ],
    highlighted: false,
    sortOrder: 1,
  },
  {
    id: "business",
    name: "Бизнес",
    priceRub: 3990,
    messagesLimit: 5000,
    botsLimit: 3,
    description: "Для растущих продаж и сервиса",
    features: [
      "До 5 000 сообщений в месяц",
      "3 Telegram Business бота",
      "Неограниченная база знаний RAG",
      "Эскалация на оператора + Webhook",
      "Приоритетная поддержка 24/7",
    ],
    highlighted: true,
    sortOrder: 2,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceRub: 8990,
    messagesLimit: Infinity,
    botsLimit: Infinity,
    description: "Для крупных компаний и сетей",
    features: [
      "Неограниченное число сообщений",
      "Любое количество ботов",
      "Индивидуальная доработка под CRM",
      "Персональный аккаунт-менеджер",
    ],
    highlighted: false,
    sortOrder: 3,
  },
];

const globalStore = globalThis as unknown as {
  __apexPlans?: Map<string, SubscriptionPlan>;
};
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

/**
 * Возвращает все тарифы для отображения на сайте/в личном кабинете,
 * отсортированные по sortOrder.
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
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

/**
 * Создаёт новый тариф или частично обновляет существующий (по id).
 * Используется из админ-панели служебного бота: /addplan, /editplan,
 * /setfeatures.
 */
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
      const supabase = createServiceClient();
      const { error } = await supabase.from("plans").upsert(planToRow(next), { onConflict: "id" });
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
      const supabase = createServiceClient();
      await supabase.from("plans").delete().eq("id", planId);
    } catch (err) {
      console.warn("[plans] Supabase delete failed:", err);
    }
  }

  return existed;
}
