import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner, FREE_TIER_TOKEN_LIMIT } from "@/lib/bots";
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

  // isFreeTier = владелец ни разу не оформлял платный тариф (bot.planId
  // отсутствует). Именно для таких ботов действует лимит в 1000 токенов
  // (см. main.py: FREE_TIER_TOKEN_LIMIT / is_free_tier).
  return NextResponse.json({
    ...status,
    plans,
    isFreeTier: !bot?.planId,
    freeTokensUsed: bot?.freeTokensUsed ?? 0,
    freeTokenLimit: FREE_TIER_TOKEN_LIMIT,
  });
}
