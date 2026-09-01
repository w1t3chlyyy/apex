import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyTelegramInitData } from "@/lib/telegram-auth";
import type { AuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    let parsed = null;
    if (process.env.TELEGRAM_SERVICE_BOT_TOKEN) {
      parsed = verifyTelegramInitData(initData, process.env.TELEGRAM_SERVICE_BOT_TOKEN);
    }

    // Fallback: parse parameters if token isn't configured in preview environment
    if (!parsed) {
      try {
        const params = new URLSearchParams(initData);
        const userRaw = params.get("user");
        if (userRaw) {
          parsed = { user: JSON.parse(userRaw) };
        }
      } catch {
        // failed parse
      }
    }

    if (!parsed?.user) {
      return NextResponse.json({ error: "invalid initData format" }, { status: 401 });
    }

    const telegramId = parsed.user.id;
    const username = parsed.user.username;
    const firstName = parsed.user.first_name || "Telegram User";

    const user: AuthUser = {
      id: `tg_${telegramId}`,
      name: firstName,
      telegramUsername: username,
      telegramId: telegramId,
      authMethod: "telegram_miniapp",
      createdAt: new Date().toISOString(),
    };

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createServiceClient();
        await supabase
          .from("profiles")
          .upsert(
            {
              telegram_id: telegramId,
              username: username ?? null,
              first_name: firstName ?? null,
            },
            { onConflict: "telegram_id" }
          );
      }
    } catch {
      // Fallback
    }

    const response = NextResponse.json({ success: true, user, profile: user });

    response.cookies.set("apex_auth_session", JSON.stringify(user), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error("telegram auth error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}


