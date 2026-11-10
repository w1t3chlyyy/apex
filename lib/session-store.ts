import type { AuthUser } from "./auth";
import { createServiceClient } from "./supabase/server";

export interface TelegramLoginSession {
  sessionId: string;
  createdAt: number;
  status: "pending" | "confirmed" | "expired";
  user?: AuthUser;
}

const TTL_MS = 10 * 60 * 1000;

// Фолбэк в памяти — только для локальной разработки без Supabase.
const g = globalThis as unknown as { __apexTelegramSessions?: Map<string, TelegramLoginSession> };
if (!g.__apexTelegramSessions) g.__apexTelegramSessions = new Map();
const memory = g.__apexTelegramSessions;

const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function assertPersistentStorageInProduction(): void {
  if (process.env.NODE_ENV === "production" && !supabaseConfigured()) {
    throw new Error(
      "Telegram login requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in production"
    );
  }
}

interface Row {
  session_id: string;
  status: string;
  user_data: AuthUser | null;
  created_at: string;
}

function rowToSession(row: Row): TelegramLoginSession {
  const createdAt = new Date(row.created_at).getTime();
  const expired = Date.now() - createdAt > TTL_MS;
  return {
    sessionId: row.session_id,
    createdAt,
    status: expired && row.status !== "confirmed" ? "expired" : (row.status as TelegramLoginSession["status"]),
    user: row.user_data ?? undefined,
  };
}

export async function createTelegramSession(sessionId: string): Promise<TelegramLoginSession> {
  assertPersistentStorageInProduction();
  const session: TelegramLoginSession = { sessionId, createdAt: Date.now(), status: "pending" };
  if (supabaseConfigured()) {
    const { error } = await createServiceClient()
      .from("telegram_login_sessions")
      .insert({ session_id: sessionId, status: "pending" });
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return session;
  }
  memory.set(sessionId, session);
  return session;
}

export async function getTelegramSession(sessionId: string): Promise<TelegramLoginSession | undefined> {
  assertPersistentStorageInProduction();
  if (supabaseConfigured()) {
    const { data, error } = await createServiceClient()
      .from("telegram_login_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) {
      console.error("[session-store] get failed:", error.message);
      throw new Error(`Supabase session lookup failed: ${error.message}`);
    }
    return data ? rowToSession(data as Row) : undefined;
  }
  const s = memory.get(sessionId);
  if (!s) return undefined;
  if (Date.now() - s.createdAt > TTL_MS && s.status !== "confirmed") s.status = "expired";
  return s;
}

export async function confirmTelegramSession(
  sessionId: string,
  user: AuthUser
): Promise<TelegramLoginSession | null> {
  assertPersistentStorageInProduction();
  const session = await getTelegramSession(sessionId);
  if (!session || session.status === "expired") return null;

  if (supabaseConfigured()) {
    const { data, error } = await createServiceClient()
      .from("telegram_login_sessions")
      .update({ status: "confirmed", user_data: user })
      .eq("session_id", sessionId)
      .select("session_id")
      .maybeSingle();
    if (error) {
      console.error("[session-store] confirm failed:", error.message);
      throw new Error(`Supabase session confirmation failed: ${error.message}`);
    }
    if (!data) return null;
    return { ...session, status: "confirmed", user };
  }

  session.status = "confirmed";
  session.user = user;
  memory.set(sessionId, session);
  return session;
}
