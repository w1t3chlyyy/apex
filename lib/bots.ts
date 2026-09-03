import { createServiceClient } from "./supabase/server";

/**
 * Бот-агент КОНКРЕТНОГО пользователя личного кабинета (не путать с сервисным
 * ботом авторизации/админ-панели — тот один на весь сервис, хранится в .env
 * как TELEGRAM_SERVICE_BOT_TOKEN, к этому файлу отношения не имеет).
 *
 * Добавлены поля ежемесячной подписки (planId + даты начала/окончания) —
 * управляются из /dashboard/billing и из админ-панели служебного бота
 * (см. lib/admin.ts, lib/subscriptions.ts).
 *
 * freeTokensUsed — счётчик потраченных токенов ответов ИИ для владельцев
 * БЕЗ платного тарифа (planId === null). Ведётся Python-сервисом (main.py)
 * напрямую в Supabase — здесь только читается, чтобы показать прогресс в
 * личном кабинете (см. app/api/bot/subscription, app/dashboard/billing).
 * FREE_TIER_TOKEN_LIMIT должен совпадать со значением переменной окружения
 * FREE_TIER_TOKEN_LIMIT в Python-сервисе (.env), иначе прогресс-бар в
 * дашборде будет показывать неверный процент.
 */
export const FREE_TIER_TOKEN_LIMIT = 25000;

export interface UserBot {
  id: string;
  ownerId: string;
  ownerTelegramId: number | null;
  botApiToken: string | null;
  systemPrompt: string;
  role: string;
  confidenceThreshold: number;
  businessConnectionId: string | null;
  webhookRegistered: boolean;
  planId: string | null;
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  freeTokensUsed: number;
}

const DEFAULTS = {
  // ИЗМЕНЕНО: раньше дефолтный промпт не диктовал поведение отдельно, но
  // Python-сервис (main.py) жёстко ограничивал бота ответами строго по
  // базе знаний и эскалировал всё остальное. Теперь main.py/qwen_client.py
  // разрешают боту отвечать на любые вопросы (включая бытовые), а
  // эскалация — крайний случай. Дефолтный промпт обновлён, чтобы не
  // противоречить новому поведению.
  systemPrompt:
    "Ты — вежливый и компетентный ассистент компании. Приоритетно используй " +
    "базу знаний компании, но свободно отвечай и на общие/бытовые вопросы " +
    "своими знаниями, как обычный живой оператор поддержки. Зови менеджера " +
    "только в действительно исключительных случаях: действия с личным " +
    "аккаунтом/оплатой/возвратом денег, жалобы, либо когда не можешь дать " +
    "достоверный ответ.",
  role: "Поддержка клиентов",
  confidenceThreshold: 0.75,
};

const globalStore = globalThis as unknown as {
  __apexUserBots?: Map<string, UserBot>; // ключ = ownerId
};
if (!globalStore.__apexUserBots) {
  globalStore.__apexUserBots = new Map();
}
const memory = globalStore.__apexUserBots;

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

interface BotRow {
  id: string;
  owner_id: string;
  owner_telegram_id?: number | null;
  bot_api_token?: string | null;
  system_prompt?: string | null;
  role?: string | null;
  confidence_threshold?: number | null;
  business_connection_id?: string | null;
  webhook_registered?: boolean | null;
  plan_id?: string | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  free_tokens_used?: number | null;
}

function rowToBot(row: BotRow): UserBot {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerTelegramId: row.owner_telegram_id ?? null,
    botApiToken: row.bot_api_token ?? null,
    systemPrompt: row.system_prompt ?? DEFAULTS.systemPrompt,
    role: row.role ?? DEFAULTS.role,
    confidenceThreshold:
      typeof row.confidence_threshold === "number"
        ? row.confidence_threshold
        : DEFAULTS.confidenceThreshold,
    businessConnectionId: row.business_connection_id ?? null,
    webhookRegistered: Boolean(row.webhook_registered),
    planId: row.plan_id ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
    freeTokensUsed: row.free_tokens_used ?? 0,
  };
}

export async function getBotByOwner(ownerId: string): Promise<UserBot | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (!error) return data ? rowToBot(data) : null;
    } catch (err) {
      console.warn("[bots] Supabase lookup failed, falling back to memory:", err);
    }
  }
  return memory.get(ownerId) ?? null;
}

export async function getBotById(botId: string): Promise<UserBot | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("id", botId)
        .maybeSingle();
      if (!error && data) return rowToBot(data);
    } catch (err) {
      console.warn("[bots] Supabase lookup by id failed:", err);
    }
  }
  for (const bot of memory.values()) {
    if (bot.id === botId) return bot;
  }
  return null;
}

interface BotPatch {
  ownerTelegramId?: number | null;
  botApiToken?: string | null;
  systemPrompt?: string;
  role?: string;
  confidenceThreshold?: number;
  businessConnectionId?: string | null;
  webhookRegistered?: boolean;
  planId?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionExpiresAt?: string | null;
}

export async function upsertBotForOwner(
  ownerId: string,
  patch: BotPatch
): Promise<UserBot> {
  const existing = await getBotByOwner(ownerId);
  const id = existing?.id ?? `bot_${ownerId}_${Date.now()}`;

  const next: UserBot = {
    id,
    ownerId,
    ownerTelegramId:
      patch.ownerTelegramId !== undefined
        ? patch.ownerTelegramId
        : existing?.ownerTelegramId ?? null,
    botApiToken:
      patch.botApiToken !== undefined ? patch.botApiToken : existing?.botApiToken ?? null,
    systemPrompt:
      patch.systemPrompt !== undefined
        ? patch.systemPrompt
        : existing?.systemPrompt ?? DEFAULTS.systemPrompt,
    role: patch.role !== undefined ? patch.role : existing?.role ?? DEFAULTS.role,
    confidenceThreshold:
      patch.confidenceThreshold !== undefined
        ? patch.confidenceThreshold
        : existing?.confidenceThreshold ?? DEFAULTS.confidenceThreshold,
    businessConnectionId:
      patch.businessConnectionId !== undefined
        ? patch.businessConnectionId
        : existing?.businessConnectionId ?? null,
    webhookRegistered:
      patch.webhookRegistered !== undefined
        ? patch.webhookRegistered
        : existing?.webhookRegistered ?? false,
    planId: patch.planId !== undefined ? patch.planId : existing?.planId ?? null,
    subscriptionStartedAt:
      patch.subscriptionStartedAt !== undefined
        ? patch.subscriptionStartedAt
        : existing?.subscriptionStartedAt ?? null,
    subscriptionExpiresAt:
      patch.subscriptionExpiresAt !== undefined
        ? patch.subscriptionExpiresAt
        : existing?.subscriptionExpiresAt ?? null,
    // free_tokens_used ведётся Python-сервисом напрямую в Supabase, здесь
    // не перезаписывается — просто переносим текущее значение, если оно
    // уже было известно (для in-memory fallback без Supabase).
    freeTokensUsed: existing?.freeTokensUsed ?? 0,
  };

  memory.set(ownerId, next);

  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      await supabase.from("bots").upsert(
        {
          id: next.id,
          owner_id: next.ownerId,
          owner_telegram_id: next.ownerTelegramId,
          bot_api_token: next.botApiToken,
          system_prompt: next.systemPrompt,
          role: next.role,
          confidence_threshold: next.confidenceThreshold,
          business_connection_id: next.businessConnectionId,
          webhook_registered: next.webhookRegistered,
          plan_id: next.planId,
          subscription_started_at: next.subscriptionStartedAt,
          subscription_expires_at: next.subscriptionExpiresAt,
          // free_tokens_used намеренно НЕ включаем в payload — Supabase
          // upsert трогает только перечисленные колонки, так что при
          // конфликте (обновлении существующей строки) значение,
          // записанное Python-сервисом, останется нетронутым.
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("[bots] Supabase upsert failed, using in-memory only:", err);
    }
  }

  return next;
}
