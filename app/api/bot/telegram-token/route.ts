import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

let telegramToken: string | null = null;

export async function GET() {
  return NextResponse.json({ connected: !!telegramToken });
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    telegramToken = token;
    return NextResponse.json({ success: true, connected: true });
  } catch (err) {
    console.error("telegram token error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
