import { MessageSquare, UserCheck, Sparkles, Info, ArrowRight, ArrowUpRight, BookOpen, Send, Sliders } from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  const stats = [
    { label: "Сообщений за сегодня", value: "128", icon: MessageSquare, change: "+14%" },
    { label: "Передано оператору", value: "7", icon: UserCheck, change: "5.4%" },
    { label: "Средняя точность RAG", value: "98.4%", icon: Sparkles, change: "+2.1%" },
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Бот онлайн
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-5">
        {stats.map((s) => {
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
                <p className="text-3xl font-bold font-heading text-black">{s.value}</p>
                <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                  {s.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Guide Banner */}
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
