"use client";

import { useEffect, useState } from "react";
import { MessageSquare, UserCheck, Bot, Info, ArrowRight, ArrowUpRight, BookOpen, Send, Sliders, Loader2 } from "lucide-react";
import Link from "next/link";

interface RecentConversation {
  id: string;
  customerUsername: string | null;
  status: string;
  lastMessage: string | null;
  createdAt: string;
  answeredByAI: boolean;
}

interface DashboardStats {
  botConnected: boolean;
  messagesToday: number;
  answeredByAIToday: number;
  escalatedOpen: number;
  totalConversations: number;
  recentConversations: RecentConversation[];
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "В работе ИИ", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  awaiting_human: { label: "Ждёт оператора", className: "bg-amber-50 text-amber-700 border-amber-200" },
  human_takeover: { label: "Ведёт человек", className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Сообщений от клиентов сегодня",
      value: stats ? String(stats.messagesToday) : "—",
      icon: MessageSquare,
    },
    {
      label: "Ответил ИИ сегодня",
      value: stats ? String(stats.answeredByAIToday) : "—",
      icon: Bot,
    },
    {
      label: "Ждут ответа оператора",
      value: stats ? String(stats.escalatedOpen) : "—",
      icon: UserCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
            Обзор и статистика
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Контролируйте показатели автоматизации вашего Telegram-бизнеса
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats?.botConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Бот подключён
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold border border-neutral-200">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              Бот не подключён
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-5">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:border-black transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-600">{s.label}</p>
                <div className="w-9 h-9 rounded-xl bg-neutral-100 text-black flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-4">
                <p className="text-3xl font-bold font-heading text-black">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-neutral-300" /> : s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Guide Banner */}
      {!loading && !stats?.botConnected && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">
                Быстрый старт: подключите Telegram Business
              </h3>
              <p className="text-sm text-neutral-600 mt-1 max-w-xl leading-relaxed">
                Внесите токен бота в разделе Telegram и наполните базу знаний регламентами или прайсом, чтобы ассистент начал моментально обрабатывать входящие лиды.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/telegram"
            className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white text-xs font-medium px-5 py-2.5 rounded-full whitespace-nowrap transition-all shadow-sm"
          >
            Подключить токен
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recent Conversations */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <h3 className="text-base font-semibold text-black">Последние диалоги</h3>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
          </div>
        ) : stats && stats.recentConversations.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {stats.recentConversations.map((c) => {
              const statusInfo = STATUS_LABELS[c.status] || {
                label: c.status,
                className: "bg-neutral-100 text-neutral-700 border-neutral-200",
              };
              return (
                <div key={c.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-black truncate">
                        {c.customerUsername ? `@${c.customerUsername}` : "Клиент без username"}
                      </p>
                      {c.answeredByAI ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 shrink-0">
                          <Bot className="w-3 h-3" /> ИИ ответил
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 shrink-0">
                          <UserCheck className="w-3 h-3" /> нужен человек
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {c.lastMessage || "Нет сообщений"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-neutral-500">
            Пока нет диалогов с клиентами. Как только кто-то напишет вашему боту в Telegram Business, диалог появится здесь.
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <Link
          href="/dashboard/knowledge-base"
          className="group bg-white border border-neutral-200 rounded-2xl p-5 hover:border-black transition-all shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-black flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-black group-hover:underline">
              База знаний (RAG)
            </h4>
            <p className="text-xs text-neutral-600 mt-1 leading-normal">
              Добавляйте регламенты, FAQ и каталоги услуг для умных ответов.
            </p>
          </div>
          <div className="flex items-center text-xs font-medium text-black mt-4 pt-3 border-t border-neutral-100 gap-1">
            <span>Управление базой</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group bg-white border border-neutral-200 rounded-2xl p-5 hover:border-black transition-all shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-black flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
              <Sliders className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-black group-hover:underline">
              Настройки бота
            </h4>
            <p className="text-xs text-neutral-600 mt-1 leading-normal">
              Задайте роль, системный промпт и порог уверенности для автоответов.
            </p>
          </div>
          <div className="flex items-center text-xs font-medium text-black mt-4 pt-3 border-t border-neutral-100 gap-1">
            <span>Конфигурация ИИ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/dashboard/telegram"
          className="group bg-white border border-neutral-200 rounded-2xl p-5 hover:border-black transition-all shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-black flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-colors">
              <Send className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-black group-hover:underline">
              Telegram Business API
            </h4>
            <p className="text-xs text-neutral-600 mt-1 leading-normal">
              Подключение сервисного бота через @BotFather в 1 клик.
            </p>
          </div>
          <div className="flex items-center text-xs font-medium text-black mt-4 pt-3 border-t border-neutral-100 gap-1">
            <span>Настройка токена</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
