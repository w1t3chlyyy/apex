"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import SubscriptionTimer from "@/components/SubscriptionTimer";
import { buildSupportTelegramLink } from "@/lib/support";

interface PlanInfo {
  id: string;
  name: string;
  priceRub: number;
  messagesLimit: number;
  botsLimit: number;
}

interface SubscriptionData {
  plan: PlanInfo | null;
  expiresAt: string | null;
  status: "active" | "expired" | "none";
  plans: PlanInfo[];
}

export default function BillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bot/subscription")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
          Подписка и оплата
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Все тарифы оплачиваются ежемесячно (30 дней). После оплаты администратор
          активирует или продлевает тариф через админ-панель служебного бота.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">
              {data?.plan ? `Текущий тариф: ${data.plan.name}` : "Тариф ещё не активирован"}
            </p>
            <SubscriptionTimer expiresAt={data?.expiresAt ?? null} />
          </div>
        </div>

        {data?.status === "expired" && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Срок действия подписки истёк. Продлите тариф, чтобы бот продолжил отвечать клиентам автоматически.</span>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          {data?.plans.map((plan) => {
            const isCurrent = data.plan?.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`border rounded-xl p-4 flex flex-col ${
                  isCurrent ? "border-black" : "border-neutral-200"
                }`}
              >
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-black mb-2">
                    <CheckCircle2 className="w-3 h-3" /> Ваш тариф
                  </span>
                )}
                <p className="text-sm font-semibold text-black">{plan.name}</p>
                <p className="text-2xl font-light text-black mt-2">
                  {plan.priceRub.toLocaleString("ru-RU")} ₽
                  <span className="text-xs text-neutral-500"> / месяц</span>
                </p>
                <a
                  href={buildSupportTelegramLink(plan.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-bw-secondary w-full mt-4 text-xs"
                >
                  {isCurrent ? "Продлить" : "Выбрать"}
                </a>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-500">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>Продление всегда добавляет 30 дней к текущей дате окончания, если подписка ещё активна.</span>
        </div>
      </div>
    </div>
  );
}
