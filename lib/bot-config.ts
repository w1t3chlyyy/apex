import { createServiceClient } from "./supabase/server";

export interface BotConfig {
  telegramToken: string | null;
  systemPrompt: string;
  role: string;
  threshold: number;
}

const DEFAULT_CONFIG: BotConfig = {
  telegramToken: null,
  systemPrompt: "Ты — вежливый ассистент поддержки интернет-магазина. Отвечай кратко и по делу.",
  role: "Поддержка клиентов",
  threshold: 0.75,
};

// In-memory кэш процесса — как и в session-store.ts, это только страховка
// для локальной разработки без Supabase. На serverless единственный надёжный
// источник правды — таблица bot_config (см. supabase/schema.sql), потому что
// именно оттуда вебхук /api/bot/webhook читает токен, чтобы отвечать в Telegram.
const globalConfig = globalThis as unknown as {
  __apexBotConfig?: BotConfig;
};

if (!globalConfig.__apexBotConfig) {
  globalConfig.__apexBotConfig = { ...DEFAULT_CONFIG };
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getBotConfig(): Promise<BotConfig> {
  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("bot_config")
        .select("telegram_token, system_prompt, role, threshold")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        const config: BotConfig = {
          telegramToken: data.telegram_token ?? null,
          systemPrompt: data.system_prompt ?? DEFAULT_CONFIG.systemPrompt,
          role: data.role ?? DEFAULT_CONFIG.role,
          threshold:
            typeof data.threshold === "number" ? data.threshold : DEFAULT_CONFIG.threshold,
        };
        globalConfig.__apexBotConfig = config;
        return config;
      }
    } catch (err) {
      console.warn("[bot-config] Supabase lookup failed, falling back to memory:", err);
    }
  }

  return globalConfig.__apexBotConfig!;
}

export async function updateBotConfig(patch: Partial<BotConfig>): Promise<BotConfig> {
  const current = globalConfig.__apexBotConfig!;
  const next: BotConfig = {
    telegramToken: patch.telegramToken !== undefined ? patch.telegramToken : current.telegramToken,
    systemPrompt: patch.systemPrompt !== undefined ? patch.systemPrompt : current.systemPrompt,
    role: patch.role !== undefined ? patch.role : current.role,
    threshold: patch.threshold !== undefined ? patch.threshold : current.threshold,
  };

  globalConfig.__apexBotConfig = next;

  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      await supabase.from("bot_config").upsert(
        {
          id: 1,
          telegram_token: next.telegramToken,
          system_prompt: next.systemPrompt,
          role: next.role,
          threshold: next.threshold,
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("[bot-config] Supabase upsert failed, using in-memory only:", err);
    }
  }

  return next;
}
