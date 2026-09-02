"use client";

import { useEffect, useState } from "react";
import { Send, Key, CheckCircle2, AlertCircle, ShieldCheck, Loader2, ExternalLink } from "lucide-react";

export default function TelegramPage() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/bot/telegram-token")
      .then((res) => res.json())
      .then((data) => setConnected(!!data.connected))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function save() {
    if (!token.trim()) return;
    setSaving(true);
    setStatus(null);
    setIsError(false);
    try {
      const res = await fetch("/api/bot/telegram-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setIsError(true);
        setStatus(data.error || "Не удалось подключить токен.");
        return;
      }

      setConnected(true);
      if (data.webhookSet) {
        setStatus("Токен успешно сохранён и верифицирован. Ваш бот готов к приёму сообщений в Telegram Business.");
      } else {
        setIsError(true);
        setStatus(
          `Токен сохранён, но вебхук RAG-сервиса не зарегистрирован: ${
            data.webhookError || "проверьте настройку PYTHON_SERVICE_URL"
          }`
        );
      }
    } catch {
      setIsError(true);
      setStatus("Не удалось подключить токен. Пожалуйста, проверьте правильность формата токена.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
          Подключение Telegram Business
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Свяжите вашего Telegram-бота для мгновенной обработки лидов и сообщений
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {!checking && connected && (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>У вас уже подключён свой бот. Вставьте новый токен ниже, если хотите его заменить.</span>
          </div>
        )}

        {/* Instruction Step Box */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-2.5">
          <p className="text-sm font-semibold text-black flex items-center gap-2">
            <Key className="w-4 h-4 text-black" />
            Инструкция по получению токена:
          </p>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-neutral-700 space-y-1.5 leading-relaxed pl-1">
            <li>
              Откройте официального бота{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-black underline hover:text-neutral-700 inline-flex items-center gap-0.5"
              >
                @BotFather <ExternalLink className="w-3 h-3 inline" />
              </a>{" "}
              в Telegram.
            </li>
            <li>
              Отправьте команду{" "}
              <code className="bg-neutral-200 text-black px-1.5 py-0.5 rounded font-mono text-xs">/newbot</code>{" "}
              и следуйте инструкциям, чтобы создать <strong>своего</strong> бота.
            </li>
            <li>Скопируйте полученный HTTP API Token и вставьте его в поле ниже.</li>
            <li>В настройках Telegram Business подключите созданного бота в разделе «Чат-боты».</li>
          </ol>
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Bot API Token</label>
          <input
            className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-3 text-sm text-black font-mono placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-neutral-500 mt-1.5">
            Это ВАШ собственный бот, а не общий бот сервиса. Токен хранится в зашифрованном виде и
            привязывается только к вашему аккаунту.
          </p>
        </div>

        {/* Action Button & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
          <button
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 text-white text-sm font-medium px-6 py-3 rounded-full transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            onClick={save}
            disabled={saving || !token.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Проверка и подключение…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Подключить Telegram Business</span>
              </>
            )}
          </button>

          {status && (
            <div
              className={`flex items-center gap-2 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl border ${
                isError
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <span>{status}</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-600">
          <ShieldCheck className="w-4 h-4 text-black shrink-0" />
          <span>Сквозное шифрование и прямая интеграция через Telegram Bot API.</span>
        </div>
      </div>
    </div>
  );
}
