import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    const parsed = verifyTelegramInitData(initData, process.env.TELEGRAM_SERVICE_BOT_TOKEN!);
    if (!parsed) {
      return NextResponse.json({ error: "invalid initData signature" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const telegramId = parsed.user.id;

    // upsert профиля по telegram_id, затем выдаём Supabase-сессию (magic link / custom token)
    const { data: profile, error } = await supabase
      .from("profiles")
      .upsert(
        {
          telegram_id: telegramId,
          username: parsed.user.username ?? null,
          first_name: parsed.user.first_name ?? null,
        },
        { onConflict: "telegram_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("telegram auth error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
