import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/current-user";
import { getPlanById } from "@/lib/plans";
import { createServiceClient } from "@/lib/supabase/server";
import { buildPaymentUrl, robokassaConfigured } from "@/lib/robokassa";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!robokassaConfigured()) {
    return NextResponse.json({ error: "Оплата временно недоступна" }, { status: 503 });
  }

  const { planId } = await req.json().catch(() => ({}));
  const plan = typeof planId === "string" ? await getPlanById(planId) : null;
  if (!plan) return NextResponse.json({ error: "Тариф не найден" }, { status: 404 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({ owner_id: user.id, plan_id: plan.id, amount: plan.priceRub })
    .select("inv_id")
    .single();

  if (error || !data) {
    console.error("[payments] insert failed:", error?.message);
    return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 500 });
  }

  const url = buildPaymentUrl({
    invId: data.inv_id,
    amount: plan.priceRub,
    description: `Подписка Apex — тариф «${plan.name}», 30 дней`,
  });

  return NextResponse.json({ url });
}
