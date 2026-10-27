import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createTelegramSession, getTelegramSession } from "@/lib/session-store";
import { SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/session-token";

export const runtime = "nodejs";

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || process.env.TELEGRAM_BOT_USERNAME || "AiApexRobot";

export async function POST() {
  try {
    const sessionId = crypto.randomBytes(16).toString("hex");
    await createTelegramSession(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      botUsername: BOT_USERNAME,
      deepLink: `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("Error creating telegram session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = new URL(req.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await getTelegramSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "confirmed" && session.user) {
      const response = NextResponse.json({ status: "confirmed", user: session.user });
      response.cookies.set(SESSION_COOKIE, signSession(session.user), sessionCookieOptions());
      return response;
    }

    return NextResponse.json({ status: session.status });
  } catch (error) {
    console.error("Error checking telegram session:", error);
    return NextResponse.json({ error: "Failed to check session" }, { status: 500 });
  }
}
