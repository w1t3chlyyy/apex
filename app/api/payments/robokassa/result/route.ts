import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyResultSignature, formatOutSum } from "@/lib/robokassa";
import { activateMonthlySubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";

async function handle(outSum: string, invId: string, signature: string) {
  const bad = (msg: string, status = 400) => new Response(msg, { status });

  if (!outSum || !invId || !signature) return bad("bad request");
  if (!verifyResultSignature(outSum, invId, signature)) return bad("bad sign");

  const supabase = createServiceClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("inv_id", Number(invId))
    .maybeSingle();

  if (!payment) return bad("payment not found", 404);

  // Повторный вызов от Robokassa — просто подтверждаем, не продлеваем второй раз
  if (payment.status === "paid") return new Response(`OK${invId}`);

  if (formatOutSum(Number(payment.amount)) !== formatOutSum(Number(outSum))) {
    return bad("amount mismatch");
  }

  // Атомарно помечаем оплаченным: защита от гонки при параллельных вызовах
  const { data: updated } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("inv_id", payment.inv_id)
    .eq("status", "pending")
    .select("inv_id");

  if (updated && updated.length > 0) {
    try {
      await activateMonthlySubscription(payment.owner_id, payment.plan_id);
    } catch (err) {
      console.error("[robokassa] activate failed:", err);
      // откатываем статус, чтобы Robokassa повторила вызов
      await supabase.from("payments").update({ status: "pending", paid_at: null }).eq("inv_id", payment.inv_id);
      return bad("activation failed", 500);
    }
  }

  return new Response(`OK${invId}`);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  return handle(String(form.get("OutSum") || ""), String(form.get("InvId") || ""), String(form.get("SignatureValue") || ""));
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(p.get("OutSum") || "", p.get("InvId") || "", p.get("SignatureValue") || "");
}
