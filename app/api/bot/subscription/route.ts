import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";
import { computeSubscriptionStatus, SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  const status = computeSubscriptionStatus(bot);

  return NextResponse.json({ ...status, plans: SUBSCRIPTION_PLANS });
}
