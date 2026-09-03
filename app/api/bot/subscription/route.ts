import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner } from "@/lib/bots";
import { computeSubscriptionStatus, getSubscriptionPlans } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  const status = await computeSubscriptionStatus(bot);
  const plans = await getSubscriptionPlans();

  return NextResponse.json({ ...status, plans });
}
