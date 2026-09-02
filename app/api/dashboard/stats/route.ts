import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getDashboardStats } from "@/lib/dashboard-stats";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await getDashboardStats(user.id);
  return NextResponse.json(stats);
}
