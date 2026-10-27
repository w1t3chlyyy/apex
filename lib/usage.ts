import type { UserBot } from "./bots";

// Счётчик «ответов ИИ» ведёт Python-сервис (main.py) в bots.ai_replies_used /
// bots.ai_replies_period_start. Окно — 30 дней от первого ответа в периоде.
export const USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function currentAiRepliesUsed(bot: UserBot | null): number {
  if (!bot?.aiRepliesPeriodStart) return 0;
  const start = new Date(bot.aiRepliesPeriodStart).getTime();
  if (Number.isNaN(start) || Date.now() - start >= USAGE_WINDOW_MS) return 0;
  return bot.aiRepliesUsed;
}

export function usageResetsAt(bot: UserBot | null): string | null {
  if (!bot?.aiRepliesPeriodStart) return null;
  const start = new Date(bot.aiRepliesPeriodStart).getTime();
  if (Number.isNaN(start) || Date.now() - start >= USAGE_WINDOW_MS) return null;
  return new Date(start + USAGE_WINDOW_MS).toISOString();
}
