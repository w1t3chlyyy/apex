import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  if (!bot) {
    return NextResponse.json({ entries: [] });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ entries: [] });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, content, created_at")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ entries: data || [] });
  } catch (err) {
    console.warn("[rag list] Не удалось получить список базы знаний:", err);
    return NextResponse.json({ entries: [] });
  }
}
