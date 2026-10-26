"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import SubscriptionTimer from "@/components/SubscriptionTimer";

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
  isFreeTier: boolean;
  freeTokensUsed: number;
  freeTokenLimit: number;
}

export default function BillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<"success" | "fail" | null>(null);

  function loadSubscription() {
    return fetch("/api/bot/subscription")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }

  useEffect(() => {
    // Robokassa возвращает пользователя на ?payment=success или ?payment=fail
    const param = new URLSearchParams(window.location.search).get("payment");
    if (param === "success" || param === "fail") setPaymentResult(param);

    loadSubscription().finally(() => setLoading(false));

    // После успешной оплаты Result URL может прийти с небольшой задержкой,
    // поэтому несколько раз перезапрашиваем статус подписки.
    if (param === "success") {
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        loadSubscription();
        if (tries >= 5) clearInterval(timer);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, []);

  async function pay(planId: string) {
    setPayingId(planId);
    setPayError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Ошибка оплаты");

      const tg = (
        window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string) => void } } }
      ).Telegram?.WebApp;
      if (tg?.openLink) tg.openLink(json.url);
      else window.location.href = json.url;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const freeTokensUsed = data?.freeTokensUsed ?? 0;
  const freeTokenLimit = data?.freeTokenLimit ?? 25000;
  const freeTokensPercent = Math.min(100, Math.round((freeTokensUsed / freeTokenLimit) * 100));
  const freeTierExhausted = freeTokensUsed >= freeTokenLimit;

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
          Подписка и оплата
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Все тарифы оплачиваются ежемесячно (30 дней). Оплата проходит через Robokassa,
          подписка активируется автоматически сразу после оплаты.
        </p>
      </div>

      {paymentResult === "success" && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Оплата прошла. Подписка активируется в течение минуты.</span>
        </div>
      )}
      {paymentResult === "fail" && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Оплата не завершена. Попробуйте ещё раз или напишите в поддержку.</span>
        </div>
      )}

      {/* Бесплатный тариф: прогресс расхода лимита токенов */}
      {data?.isFreeTier && (
        <div
          className={`bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-4 ${
            freeTierExhausted ? "border-rose-300" : "border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                freeTierExhausted ? "bg-rose-600 text-white" : "bg-black text-white"
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black">
                Бесплатный тариф — {freeTokensUsed} / {freeTokenLimit} токенов
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Лимит на ответы ИИ клиентам. После исчерпания бот перестаёт отвечать
                автоматически, пока не будет оформлен платный тариф.
              </p>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                freeTierExhausted ? "bg-rose-600" : "bg-black"
              }`}
              style={{ width: `${freeTokensPercent}%` }}
            />
          </div>

          {freeTierExhausted && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Бесплатный лимит исчерпан — бот больше не отвечает клиентам автоматически.
                Выберите тариф ниже, чтобы возобновить работу.
              </span>
            </div>
          )}
        </div>
      )}

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
                <button
                  type="button"
                  onClick={() => pay(plan.id)}
                  disabled={payingId !== null}
                  className="btn-bw-secondary w-full mt-4 text-xs"
                >
                  {payingId === plan.id
                    ? "Переход к оплате…"
                    : isCurrent
                    ? "Продлить"
                    : "Оплатить"}
                </button>
              </div>
            );
          })}
        </div>

        {payError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{payError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>Продление всегда добавляет 30 дней к текущей дате окончания, если подписка ещё активна.</span>
          </div>
          <Link
            href="/offer"
            target="_blank"
            className="text-neutral-600 hover:text-black underline underline-offset-2 shrink-0"
          >
            Условия публичной оферты
          </Link>
        </div>
      </div>
    </div>
  );
}
