import crypto from "crypto";
import { createServiceClient } from "./supabase/server";

// Коды хранятся в Supabase (таблица email_otps) в виде хеша: на serverless
// разные запросы попадают в разные инстансы, память процесса не подходит.
// Без Supabase (локальная разработка) — фолбэк в памяти.

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

interface OtpEntry {
  codeHash: string;
  createdAt: number;
  attempts: number;
}

const g = globalThis as unknown as { __apexEmailOtps?: Map<string, OtpEntry> };
if (!g.__apexEmailOtps) g.__apexEmailOtps = new Map();
const memory = g.__apexEmailOtps;

const useDb = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function hashCode(email: string, code: string) {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "otp-dev-secret")
    .update(`${email}:${code.trim()}`)
    .digest("hex");
}

async function load(email: string): Promise<OtpEntry | null> {
  if (useDb()) {
    const { data, error } = await createServiceClient()
      .from("email_otps")
      .select("code_hash, created_at, attempts")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(`email_otps read failed: ${error.message}`);
    return data
      ? { codeHash: data.code_hash, createdAt: new Date(data.created_at).getTime(), attempts: data.attempts ?? 0 }
      : null;
  }
  return memory.get(email) ?? null;
}

async function save(email: string, entry: OtpEntry) {
  if (useDb()) {
    const { error } = await createServiceClient().from("email_otps").upsert({
      email,
      code_hash: entry.codeHash,
      created_at: new Date(entry.createdAt).toISOString(),
      attempts: entry.attempts,
    });
    if (error) throw new Error(`email_otps write failed: ${error.message}`);
    return;
  }
  memory.set(email, entry);
}

async function remove(email: string) {
  if (useDb()) {
    await createServiceClient().from("email_otps").delete().eq("email", email);
    return;
  }
  memory.delete(email);
}

export async function createOtp(email: string): Promise<{ code?: string; error?: string }> {
  const existing = await load(email);
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN_MS) {
    return { error: "Код уже отправлен, подождите немного перед повторным запросом" };
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await save(email, { codeHash: hashCode(email, code), createdAt: Date.now(), attempts: 0 });
  return { code };
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const entry = await load(email);
  if (!entry) return { ok: false, error: "Код не найден или устарел. Запросите новый код." };

  if (Date.now() - entry.createdAt > OTP_TTL_MS) {
    await remove(email);
    return { ok: false, error: "Код истёк. Запросите новый код." };
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    await remove(email);
    return { ok: false, error: "Слишком много неверных попыток. Запросите новый код." };
  }

  const given = Buffer.from(hashCode(email, code), "hex");
  const expected = Buffer.from(entry.codeHash, "hex");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    await save(email, entry);
    return { ok: false, error: "Неверный код подтверждения." };
  }

  await remove(email);
  return { ok: true };
}
