import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigests } from "@/lib/daily-digest";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Защита: CRON_SECRET обязателен. Vercel Cron сам шлёт заголовок
 * "Authorization: Bearer <CRON_SECRET>"; для совместимости со старым
 * vercel.json принимается и ?secret=<CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET не задан" }, { status: 503 });
  }
  const bearer = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  if (bearer !== `Bearer ${secret}` && query !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await sendDailyDigests();
  return NextResponse.json({ ok: true, ...result });
}
