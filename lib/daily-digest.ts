import { createServiceClient } from "./supabase/server";

interface BotDigestRow {
  id: string;
  owner_telegram_id: number | null;
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function tgSendMessage(token: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.warn("[daily-digest] Не удалось отправить сообщение:", err);
  }
}

export interface DailyDigestResult {
  totalBots: number;
  sent: number;
}

/**
 * Раз в день (вызывается из /api/cron/daily-digest, см. vercel.json) отправляет
 * каждому владельцу бота через СЕРВИСНЫЙ бот (TELEGRAM_SERVICE_BOT_TOKEN)
 * сводку: сколько клиентов написали за день, на сколько ответил ИИ и сколько
 * диалогов сейчас ждут оператора. Если за день не было ни одного сообщения —
 * владельцу ничего не отправляется, чтобы не спамить.
 */
export async function sendDailyDigests(): Promise<DailyDigestResult> {
  const serviceToken = process.env.TELEGRAM_SERVICE_BOT_TOKEN || "";
  if (!serviceToken || !supabaseConfigured()) {
    return { totalBots: 0, sent: 0 };
  }

  const supabase = createServiceClient();

  const { data: bots, error } = await supabase
    .from("bots")
    .select("id, owner_telegram_id")
    .not("owner_telegram_id", "is", null);

  if (error || !bots) {
    console.warn("[daily-digest] Не удалось получить список ботов:", error?.message);
    return { totalBots: 0, sent: 0 };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let sent = 0;

  for (const bot of bots as BotDigestRow[]) {
    if (!bot.owner_telegram_id) continue;

    try {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("id")
        .eq("bot_id", bot.id);
      const convIds = (convRows || []).map((c) => c.id);
      if (convIds.length === 0) continue;

      const { count: customerMsgs } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("role", "customer")
        .gte("created_at", startOfDay.toISOString());

      if (!customerMsgs) continue; // за сегодня не было активности — не беспокоим

      const { count: aiMsgs } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("role", "assistant")
        .gte("created_at", startOfDay.toISOString());

      const { count: escalated } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("bot_id", bot.id)
        .eq("status", "awaiting_human");

      const text =
        `📊 <b>Итоги дня по вашему боту</b>\n\n` +
        `Сообщений от клиентов: <b>${customerMsgs}</b>\n` +
        `Ответил ИИ автоматически: <b>${aiMsgs ?? 0}</b>\n` +
        `Сейчас ждут оператора: <b>${escalated ?? 0}</b>`;

      await tgSendMessage(serviceToken, bot.owner_telegram_id, text);
      sent++;
    } catch (err) {
      console.warn(`[daily-digest] Ошибка обработки бота ${bot.id}:`, err);
    }
  }

  return { totalBots: bots.length, sent };
}
