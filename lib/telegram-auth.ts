import crypto from "crypto";

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Проверяет подпись initData Telegram Mini App:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Дополнительно отклоняет устаревшие данные (auth_date старше 24 часов).
 */
export function verifyTelegramInitData(
  initData: string,
  botToken?: string
): { user: TelegramUser } | null {
  if (!botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) return null;

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== computed.length || !crypto.timingSafeEqual(given, computed)) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as TelegramUser;
    if (typeof user?.id !== "number") return null;
    return { user };
  } catch {
    return null;
  }
}
