interface OtpEntry {
  code: string;
  createdAt: number;
  attempts: number;
}

// In-memory хранилище (как и session-store.ts для Telegram) — для прод с
// несколькими инстансами сервера стоит вынести в Redis/Supabase, но для
// одного serverless-инстанса этого достаточно.
const globalStore = globalThis as unknown as {
  __apexEmailOtps?: Map<string, OtpEntry>;
};
if (!globalStore.__apexEmailOtps) {
  globalStore.__apexEmailOtps = new Map();
}
const otps = globalStore.__apexEmailOtps;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 минут
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 секунд между повторными отправками

export function createOtp(email: string): { code: string; error?: string } {
  const existing = otps.get(email);
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN_MS) {
    return { code: existing.code, error: "Код уже отправлен, подождите немного перед повторным запросом" };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 цифр
  otps.set(email, { code, createdAt: Date.now(), attempts: 0 });
  return { code };
}

export function verifyOtp(email: string, code: string): { ok: boolean; error?: string } {
  const entry = otps.get(email);
  if (!entry) {
    return { ok: false, error: "Код не найден или устарел. Запросите новый код." };
  }
  if (Date.now() - entry.createdAt > OTP_TTL_MS) {
    otps.delete(email);
    return { ok: false, error: "Код истёк. Запросите новый код." };
  }
  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    otps.delete(email);
    return { ok: false, error: "Слишком много неверных попыток. Запросите новый код." };
  }
  if (entry.code !== code.trim()) {
    return { ok: false, error: "Неверный код подтверждения." };
  }
  otps.delete(email);
  return { ok: true };
}
