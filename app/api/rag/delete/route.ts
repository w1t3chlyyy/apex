import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const bot = await getBotByOwner(user.id);
  if (!bot) {
    return NextResponse.json({ error: "Бот не найден" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  try {
    const supabase = createServiceClient();
    // .eq("bot_id", bot.id) — защита, чтобы нельзя было удалить чужую запись
    const { error } = await supabase
      .from("knowledge_base")
      .delete()
      .eq("id", id)
      .eq("bot_id", bot.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[rag delete] Ошибка удаления:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
