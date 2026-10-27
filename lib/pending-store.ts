import { createServiceClient } from "./supabase/server";

// Состояние многошаговых сценариев служебного бота («введите ответ клиенту»,
// «введите новую цену» и т.д.). Хранится в Supabase (pending_actions), т.к. на
// serverless следующее сообщение может прийти в другой инстанс.

const TTL_MS = 60 * 60 * 1000;

const g = globalThis as unknown as { __apexPending?: Map<string, { payload: unknown; at: number }> };
if (!g.__apexPending) g.__apexPending = new Map();
const memory = g.__apexPending;

const dbConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function setPending<T>(key: string, payload: T): Promise<void> {
  if (dbConfigured()) {
    const { error } = await createServiceClient()
      .from("pending_actions")
      .upsert({ key, payload, created_at: new Date().toISOString() });
    if (error) console.error("[pending-store] set failed:", error.message);
    return;
  }
  memory.set(key, { payload, at: Date.now() });
}

export async function getPending<T>(key: string): Promise<T | null> {
  if (dbConfigured()) {
    const { data, error } = await createServiceClient()
      .from("pending_actions")
      .select("payload, created_at")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_MS) {
      await deletePending(key);
      return null;
    }
    return data.payload as T;
  }
  const m = memory.get(key);
  if (!m || Date.now() - m.at > TTL_MS) return null;
  return m.payload as T;
}

export async function deletePending(key: string): Promise<void> {
  if (dbConfigured()) {
    await createServiceClient().from("pending_actions").delete().eq("key", key);
    return;
  }
  memory.delete(key);
}
