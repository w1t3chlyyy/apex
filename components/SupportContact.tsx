"use client";

import { useState } from "react";
import {
  Send,
  Mail,
  Clock,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function SupportContact() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !contact.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName("");
      setContact("");
      setMessage("");
    }, 600);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start">
      {/* Левая колонка: Прямые каналы связи */}
      <div className="lg:col-span-5 space-y-4">
        <div className="card-bw p-6 md:p-8 bg-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-medium text-black mb-4">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            Служба заботы 24/7
          </div>
          <h3 className="text-xl font-semibold text-black tracking-tight">
            Всегда на связи и готовы помочь
          </h3>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            Поможем подключить Telegram Business, подготовить базу знаний или настроить индивидуальную интеграцию с вашей CRM-системой.
          </p>

          <div className="mt-6 space-y-3">
            {/* Telegram Support Button */}
            <a
              href="https://t.me/telegram"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-black group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Send className="w-4 h-4 -rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black group-hover:underline">
                    Чат в Telegram
                  </p>
                  <p className="text-xs text-neutral-500">@HustlifyHelp</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-black transition-colors" />
            </a>

            {/* Email Support */}
            <a
              href="mailto:support@neuralkinetics.io"
              className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-black group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black group-hover:underline">
                    Электронная почта
                  </p>
                  <p className="text-xs text-neutral-500">hustlify@mail.ru</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-black transition-colors" />
            </a>
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center gap-3 text-xs text-neutral-500">
            <Clock className="w-4 h-4 text-black shrink-0" />
            <span>Среднее время ответа специалиста: <strong className="text-black font-semibold">до 5 минут</strong></span>
          </div>
        </div>

        {/* FAQ мини-подсказки */}
        <div className="card-bw p-6 bg-neutral-50/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">
            <HelpCircle className="w-4 h-4 text-black" />
            Частые вопросы
          </div>
          <div className="space-y-3 text-xs text-neutral-600">
            <div className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
              <span>Нужны ли навыки программирования для настройки? <strong className="text-black font-medium">Нет, всё настраивается через визуальный дашборд.</strong></span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
              <span>Можно ли подключить личный аккаунт Telegram? <strong className="text-black font-medium">Да, через стандартный Telegram Business.</strong></span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
              <span>Как наполнять базу знаний? <strong className="text-black font-medium">Просто добавьте текст, FAQ или регламенты в разделе RAG.</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Правая колонка: Интерактивная форма обращения */}
      <div className="lg:col-span-7">
        <div className="card-bw p-6 md:p-8 bg-white">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-black tracking-tight">
              Напишите нам напрямую
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Задайте любой вопрос или запросите индивидуальную демонстрацию
            </p>
          </div>

          {submitted ? (
            <div className="py-12 px-6 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold text-black">
                Обращение успешно отправлено!
              </h4>
              <p className="text-sm text-neutral-600 max-w-md mx-auto">
                Спасибо за обращение. Мы получили ваше сообщение и свяжемся с вами в указанный Telegram / Email в ближайшее время.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="btn-bw-secondary text-sm mt-2"
              >
                Отправить ещё сообщение
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Александр"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-bw w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Telegram (@username) или Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="@username или mail@company.ru"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="input-bw w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Ваш вопрос или описание задачи *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Расскажите, какой у вас бизнес и какую задачу хотите решить с помощью AI-ассистента..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-bw w-full resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                  <span>Ваши данные защищены и используются исключительно для ответа.</span>
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-bw-primary w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {loading ? "Отправка..." : "Отправить вопрос"}
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
