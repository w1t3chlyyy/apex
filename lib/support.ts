const SUPPORT_TELEGRAM_USERNAME =
  process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_USERNAME || "HustlifyHelp";

/**
 * Формирует ссылку на Telegram-чат с поддержкой с заранее заполненным текстом сообщения.
 * Используется на всех кнопках, связанных с оплатой тарифов.
 */
export function buildSupportTelegramLink(planName?: string) {
  const message = planName
    ? `Здравствуйте, хочу оплатить тариф «${planName}»`
    : "Здравствуйте, хочу оплатить тариф";

  return `https://t.me/${SUPPORT_TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;
}
