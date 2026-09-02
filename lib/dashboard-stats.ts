import { createServiceClient } from "./supabase/server";
import { getBotByOwner } from "./bots";

export interface RecentConversation {
  id: string;
  customerUsername: string | null;
  status: string;
  lastMessage: string | null;
  createdAt: string;
}

export interface DashboardStats {
  botConnected: boolean;
  messagesToday: number;
  escalatedOpen: number;
  totalConversations: number;
  recentConversations: RecentConversation[];
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const EMPTY_STATS: DashboardStats = {
  botConnected: false,
  messagesToday: 0,
  escalatedOpen: 0,
  totalConversations: 0,
  recentConversations: [],
};

/**
 * Собирает реальную статистику для карточек дашборда личного кабинета.
 * Если Supabase не настроен или таблицы ещё не созданы (см. lib/supabase/schema.sql) —
 * тихо возвращает нули вместо падения страницы.
 */
export async function getDashboardStats(ownerId: string): Promise<DashboardStats> {
  const bot = await getBotByOwner(ownerId);
  if (!bot) return EMPTY_STATS;

  const botConnected = Boolean(bot.botApiToken);

  if (!supabaseConfigured()) {
    return { ...EMPTY_STATS, botConnected };
  }

  try {
    const supabase = createServiceClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, customer_username, status, created_at")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (convError) throw convError;

    const { count: totalConversations } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id);

    const { count: escalatedOpen } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id)
      .eq("status", "awaiting_human");

    let messagesToday = 0;
    const conversationIds = (conversations || []).map((c) => c.id);
    if (conversationIds.length > 0) {
      // Считаем сообщения клиентов за сегодня по диалогам этого бота.
      const { data: allConvIdsRows } = await supabase
        .from("conversations")
        .select("id")
        .eq("bot_id", bot.id);
      const allIds = (allConvIdsRows || []).map((r) => r.id);

      if (allIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", allIds)
          .eq("role", "customer")
          .gte("created_at", startOfDay.toISOString());
        messagesToday = count ?? 0;
      }
    }

    const recentConversations: RecentConversation[] = await Promise.all(
      (conversations || []).map(async (c) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          id: c.id,
          customerUsername: c.customer_username,
          status: c.status,
          lastMessage: lastMsg?.content ?? null,
          createdAt: c.created_at,
        };
      })
    );

    return {
      botConnected,
      messagesToday,
      escalatedOpen: escalatedOpen ?? 0,
      totalConversations: totalConversations ?? 0,
      recentConversations,
    };
  } catch (err) {
    console.warn("[dashboard-stats] Supabase query failed, showing zeros:", err);
    return { ...EMPTY_STATS, botConnected };
  }
}
