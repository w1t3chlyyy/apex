import type { AuthUser } from "./auth";
import { createServiceClient } from "./supabase/server";

// Global in-memory fallback cache (used when Supabase isn't configured or fails)
const globalRegistry = globalThis as unknown as {
  __apexTelegramRegistry?: Map<number, AuthUser>;
};

if (!globalRegistry.__apexTelegramRegistry) {
  globalRegistry.__apexTelegramRegistry = new Map<number, AuthUser>();
}

const memoryRegistry = globalRegistry.__apexTelegramRegistry;

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Ищет пользователя, который уже подтвердил вход через сайт/бота (т.е. "зарегистрирован").
 * Используется в /api/auth/telegram, чтобы решить — пускать в Mini App или показать гейт.
 */
export async function findRegisteredTelegramUser(telegramId: number): Promise<AuthUser | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("telegram_id, username, first_name")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: `tg_${data.telegram_id}`,
          name: data.first_name || "Telegram User",
          telegramUsername: data.username ?? undefined,
          telegramId: data.telegram_id,
          authMethod: "telegram_miniapp",
          createdAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn("[telegram-registry] Supabase lookup failed, falling back to memory:", err);
    }
  }

  return memoryRegistry.get(telegramId) ?? null;
}

/**
 * Регистрирует пользователя как "подтверждённого" после успешного входа через бота/сайт.
 */
export async function registerTelegramUser(user: AuthUser) {
  if (!user.telegramId) return;

  memoryRegistry.set(user.telegramId, user);

  if (supabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      await supabase.from("profiles").upsert(
        {
          telegram_id: user.telegramId,
          username: user.telegramUsername ?? null,
          first_name: user.name ?? null,
        },
        { onConflict: "telegram_id" }
      );
    } catch (err) {
      console.warn("[telegram-registry] Supabase upsert failed, using in-memory only:", err);
    }
  }
}
