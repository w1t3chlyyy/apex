import { createServiceClient } from "./supabase/server";

/**
 * Бот-агент КОНКРЕТНОГО пользователя личного кабинета (не сервисный бот).
 * free_tokens_used и ai_replies_* ведёт Python-сервис (main.py) напрямую в
 * Supabase; здесь они читаются и (ai_replies_*) сбрасываются только при
 * явной передаче в patch.
 */
// Должен совпадать с FREE_TIER_TOKEN_LIMIT в окружении Python-сервиса.
export const FREE_TIER_TOKEN_LIMIT = Number(process.env.FREE_TIER_TOKEN_LIMIT) || 15000;

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
  aiRepliesUsed: number;
  aiRepliesPeriodStart: string | null;
}

const DEFAULTS = {
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

const globalStore = globalThis as unknown as { __apexUserBots?: Map<string, UserBot> };
if (!globalStore.__apexUserBots) globalStore.__apexUserBots = new Map();
const memory = globalStore.__apexUserBots;

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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
  ai_replies_used?: number | null;
  ai_replies_period_start?: string | null;
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
      typeof row.confidence_threshold === "number" ? row.confidence_threshold : DEFAULTS.confidenceThreshold,
    businessConnectionId: row.business_connection_id ?? null,
    webhookRegistered: Boolean(row.webhook_registered),
    planId: row.plan_id ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
    freeTokensUsed: row.free_tokens_used ?? 0,
    aiRepliesUsed: row.ai_replies_used ?? 0,
    aiRepliesPeriodStart: row.ai_replies_period_start ?? null,
  };
}

export async function getBotByOwner(ownerId: string): Promise<UserBot | null> {
  if (supabaseConfigured()) {
    try {
      const { data, error } = await createServiceClient()
        .from("bots")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (!error) return data ? rowToBot(data) : null;
      console.warn("[bots] Supabase lookup error:", error.message);
    } catch (err) {
      console.warn("[bots] Supabase lookup failed, falling back to memory:", err);
    }
  }
  return memory.get(ownerId) ?? null;
}

export async function getBotById(botId: string): Promise<UserBot | null> {
  if (supabaseConfigured()) {
    try {
      const { data, error } = await createServiceClient()
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
  aiRepliesUsed?: number;
  aiRepliesPeriodStart?: string | null;
}

export async function upsertBotForOwner(ownerId: string, patch: BotPatch): Promise<UserBot> {
  const existing = await getBotByOwner(ownerId);
  const id = existing?.id ?? `bot_${ownerId}_${Date.now()}`;

  const next: UserBot = {
    id,
    ownerId,
    ownerTelegramId:
      patch.ownerTelegramId !== undefined ? patch.ownerTelegramId : existing?.ownerTelegramId ?? null,
    botApiToken: patch.botApiToken !== undefined ? patch.botApiToken : existing?.botApiToken ?? null,
    systemPrompt:
      patch.systemPrompt !== undefined ? patch.systemPrompt : existing?.systemPrompt ?? DEFAULTS.systemPrompt,
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
      patch.webhookRegistered !== undefined ? patch.webhookRegistered : existing?.webhookRegistered ?? false,
    planId: patch.planId !== undefined ? patch.planId : existing?.planId ?? null,
    subscriptionStartedAt:
      patch.subscriptionStartedAt !== undefined
        ? patch.subscriptionStartedAt
        : existing?.subscriptionStartedAt ?? null,
    subscriptionExpiresAt:
      patch.subscriptionExpiresAt !== undefined
        ? patch.subscriptionExpiresAt
        : existing?.subscriptionExpiresAt ?? null,
    freeTokensUsed: existing?.freeTokensUsed ?? 0,
    aiRepliesUsed: patch.aiRepliesUsed !== undefined ? patch.aiRepliesUsed : existing?.aiRepliesUsed ?? 0,
    aiRepliesPeriodStart:
      patch.aiRepliesPeriodStart !== undefined
        ? patch.aiRepliesPeriodStart
        : existing?.aiRepliesPeriodStart ?? null,
  };

  if (supabaseConfigured()) {
    // free_tokens_used и ai_replies_* пишет Python-сервис — в payload они
    // попадают только если явно переданы (например, сброс при оплате).
    const payload: Record<string, unknown> = {
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
    };
    if (patch.aiRepliesUsed !== undefined) payload.ai_replies_used = next.aiRepliesUsed;
    if (patch.aiRepliesPeriodStart !== undefined) payload.ai_replies_period_start = next.aiRepliesPeriodStart;

    // supabase-js не бросает исключение, а возвращает { error } — раньше это
    // игнорировалось, и активация тарифа могла «пройти», не сохранившись.
    const { error } = await createServiceClient().from("bots").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("[bots] Supabase upsert failed:", error.message);
      throw new Error(`Не удалось сохранить бота: ${error.message}`);
    }
  }

  memory.set(ownerId, next);
  return next;
}
