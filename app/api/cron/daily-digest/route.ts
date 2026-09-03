import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigests } from "@/lib/daily-digest";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Защищено секретом: Vercel Cron вызывает этот URL с ?secret=CRON_SECRET
 * (см. vercel.json). Если CRON_SECRET не задан в .env — проверка отключена
 * (не рекомендуется для продакшена).
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await sendDailyDigests();
  return NextResponse.json({ ok: true, ...result });
}
