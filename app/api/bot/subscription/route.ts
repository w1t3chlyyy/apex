import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getBotByOwner, FREE_TIER_TOKEN_LIMIT } from "@/lib/bots";
import { computeSubscriptionStatus, getSubscriptionPlans } from "@/lib/subscriptions";
import { currentAiRepliesUsed, usageResetsAt } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = await getBotByOwner(user.id);
  const status = await computeSubscriptionStatus(bot);
  const plans = await getSubscriptionPlans();

  // messagesLimit: null при наличии тарифа = безлимит (Infinity не сериализуется).
  const limit = status.plan && Number.isFinite(status.plan.messagesLimit) ? status.plan.messagesLimit : null;

  return NextResponse.json({
    ...status,
    plans,
    isFreeTier: !bot?.planId,
    freeTokensUsed: bot?.freeTokensUsed ?? 0,
    freeTokenLimit: FREE_TIER_TOKEN_LIMIT,
    messagesUsed: currentAiRepliesUsed(bot),
    messagesLimit: limit,
    usageResetsAt: usageResetsAt(bot),
  });
}
