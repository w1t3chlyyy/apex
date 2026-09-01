import crypto from "crypto";

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

/**
 * Проверяет подпись initData Telegram Mini App согласно официальному алгоритму:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
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

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  const user = JSON.parse(userRaw) as TelegramUser;
  return { user };
}
