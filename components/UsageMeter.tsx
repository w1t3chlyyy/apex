"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

interface Usage {
  plan: { name: string } | null;
  status: "active" | "expired" | "none";
  messagesUsed: number;
  messagesLimit: number | null;
  usageResetsAt: string | null;
}

/** Расход лимита «ответов ИИ» по платному тарифу. Показывается только при активной подписке. */
export default function UsageMeter() {
  const [data, setData] = useState<Usage | null>(null);

  useEffect(() => {
    fetch("/api/bot/subscription")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || !data.plan || data.status !== "active") return null;

  const unlimited = data.messagesLimit === null;
  const percent = unlimited ? 0 : Math.min(100, Math.round((data.messagesUsed / (data.messagesLimit || 1)) * 100));
  const exhausted = !unlimited && data.messagesUsed >= (data.messagesLimit || 0);

  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm space-y-3 ${exhausted ? "border-rose-300" : "border-neutral-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${exhausted ? "bg-rose-600" : "bg-black"}`}>
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black">
            Ответы ИИ: {data.messagesUsed}
            {unlimited ? " (без лимита)" : ` / ${data.messagesLimit}`}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {data.usageResetsAt
              ? `Счётчик обнулится ${new Date(data.usageResetsAt).toLocaleDateString("ru-RU")}`
              : "Счётчик начнётся с первого ответа"}
          </p>
        </div>
      </div>
      {!unlimited && (
        <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${exhausted ? "bg-rose-600" : "bg-black"}`} style={{ width: `${percent}%` }} />
        </div>
      )}
      {exhausted && (
        <p className="text-xs font-medium text-rose-700">
          Лимит ответов по тарифу исчерпан — бот передаёт диалоги вам. Перейдите на тариф выше или дождитесь обнуления.
        </p>
      )}
    </div>
  );
}
