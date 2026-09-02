import { createServiceClient } from "./supabase/server";

/**
 * Бот-агент КОНКРЕТНОГО пользователя личного кабинета (не путать с сервисным
 * ботом авторизации — тот один на весь сервис и хранится в .env как
 * TELEGRAM_SERVICE_BOT_TOKEN, к этому файлу отношения не имеет).
 *
 * Раньше эта сущность ошибочно хранилась в singleton-таблице bot_config
 * (см. lib/bot-config.ts) — одна строка на весь сервис. Теперь у каждого
 * пользователя своя строка в таблице `bots`, найти её можно по owner_id.
 */
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
}

const DEFAULTS = {
  systemPrompt:
    "Ты — вежливый ассистент поддержки клиентов. Отвечай кратко и по делу.",
  role: "Поддержка клиентов",
  confidenceThreshold: 0.75,
};

// In-memory fallback — как и в остальных lib/*-store.ts файлах проекта,
// используется только для локальной разработки без Supabase.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBot(row: any): UserBot {
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

export async function upsertBotForOwner(
  ownerId: string,
  patch: Partial<
    Pick<
      UserBot,
      | "ownerTelegramId"
      | "botApiToken"
      | "systemPrompt"
      | "role"
      | "confidenceThreshold"
      | "businessConnectionId"
      | "webhookRegistered"
    >
  >
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
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("[bots] Supabase upsert failed, using in-memory only:", err);
    }
  }

  return next;
}
