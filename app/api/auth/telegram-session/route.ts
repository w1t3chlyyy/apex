import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createTelegramSession, getTelegramSession } from "@/lib/session-store";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "AiApexRobot";

export async function POST() {
  try {
    const sessionId = crypto.randomBytes(16).toString("hex");
    await createTelegramSession(sessionId);

    const deepLink = `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`;

    return NextResponse.json({
      success: true,
      sessionId,
      botUsername: BOT_USERNAME,
      deepLink,
      expiresIn: 600, // 10 минут
    });
  } catch (error) {
    console.error("Error creating telegram session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    const session = await getTelegramSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "confirmed" && session.user) {
      const response = NextResponse.json({
        status: "confirmed",
        user: session.user,
      });

      response.cookies.set("apex_auth_session", JSON.stringify(session.user), {
        path: "/",
        maxAge: 60 * 60 * 24 * 180, // 180 дней — дольше не просим войти заново
        sameSite: "lax",
        httpOnly: false,
      });

      return response;
    }

    return NextResponse.json({
      status: session.status,
    });
  } catch (error) {
    console.error("Error checking telegram session:", error);
    return NextResponse.json(
      { error: "Failed to check session" },
      { status: 500 }
    );
  }
}
