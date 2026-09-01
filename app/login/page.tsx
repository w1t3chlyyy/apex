"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Mail,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { setClientUser } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [activeTab, setActiveTab] = useState<"telegram" | "email">("telegram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telegram session state
  const [tgSessionId, setTgSessionId] = useState<string | null>(null);
  const [tgDeepLink, setTgDeepLink] = useState<string>("");
  const [tgBotUsername, setTgBotUsername] = useState<string>("AiApexRobot");
  const [tgStatus, setTgStatus] = useState<"loading" | "waiting" | "success">("loading");
  const [showQr, setShowQr] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Email form state
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  // 1. Check if running inside Telegram Mini App
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: { user?: { first_name?: string; username?: string; id?: number } }; expand?: () => void } } }).Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.expand?.();
        // Auto-login via Telegram Mini App
        fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.user) {
              setClientUser(data.user);
              router.push(redirectTarget);
            }
          })
          .catch(() => {});
      }
    }
  }, [redirectTarget, router]);

  // 2. Initialize Telegram Session
  const initTelegramSession = useCallback(async () => {
    try {
      setTgStatus("loading");
      setError(null);
      const res = await fetch("/api/auth/telegram-session", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTgSessionId(data.sessionId);
        setTgDeepLink(data.deepLink);
        if (data.botUsername) setTgBotUsername(data.botUsername);
        setTgStatus("waiting");
      } else {
        setError("Не удалось сформировать сессию для Telegram");
      }
    } catch {
      setError("Ошибка сети при создании сессии Telegram");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "telegram" && !tgSessionId) {
      initTelegramSession();
    }
  }, [activeTab, tgSessionId, initTelegramSession]);

  // 3. Poll for Telegram confirmation
  useEffect(() => {
    if (activeTab !== "telegram" || !tgSessionId || tgStatus === "success") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch(`/api/auth/telegram-session?sessionId=${tgSessionId}`);
        const data = await res.json();
        if (data.status === "confirmed" && data.user) {
          setTgStatus("success");
          setClientUser(data.user);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setTimeout(() => {
            router.push(redirectTarget);
          }, 800);
        }
      } catch {
        // Continue polling
      }
    };

    pollTimerRef.current = setInterval(checkSession, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeTab, tgSessionId, tgStatus, redirectTarget, router]);

  // Quick Demo confirmation simulator
  const handleSimulateTelegramConfirm = async () => {
    if (!tgSessionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: tgSessionId,
          telegramUser: {
            id: 987654321,
            first_name: "Алексей (Telegram)",
            username: "hustlify_client",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTgStatus("success");
        setClientUser(data.user);
        setTimeout(() => {
          router.push(redirectTarget);
        }, 600);
      }
    } catch {
      setError("Не удалось подтвердить сессию");
    } finally {
      setLoading(false);
    }
  };

  // Email handlers
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setDemoCodeHint(data.demoCode || "7742");
      } else {
        setError(data.error || "Не удалось отправить код");
      }
    } catch {
      setError("Ошибка сети при отправке кода");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("Введите 4-значный код");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setClientUser(data.user);
        router.push(redirectTarget);
      } else {
        setError(data.error || "Неверный код подтверждения");
      }
    } catch {
      setError("Ошибка при проверке кода");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 md:p-8 text-neutral-900 selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          На главную
        </Link>
        <div className="flex items-center gap-2">
          <BrandLogo className="w-6 h-6" />
          <span className="font-heading text-sm font-semibold tracking-tight text-black">
            Apex
          </span>
        </div>
      </header>

      {/* Main Auth Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm">
          {/* Card Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-light tracking-tight text-black">
              Вход в кабинет
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Выберите удобный способ входа или быстрой регистрации
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("telegram");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "telegram"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Telegram
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "email"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Почта
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TELEGRAM AUTH TAB */}
          {activeTab === "telegram" && (
            <div className="space-y-5">
              {tgStatus === "success" ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading text-lg font-medium text-black">
                    Успешная авторизация!
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Перенаправляем в ваш личный кабинет...
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Нажмите кнопку ниже для перехода в Telegram-бота{" "}
                        <span className="font-semibold text-black">@{tgBotUsername}</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        В боте нажмите кнопку <span className="font-semibold text-black">«Запустить»</span> или <span className="font-semibold text-black">«Войти»</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Вход на сайте произойдёт автоматически за 1 секунду
                      </p>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <a
                    href={tgDeepLink || `https://t.me/${tgBotUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Перейти в Telegram-бота</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </a>

                  {/* QR Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="w-full py-2.5 px-4 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQr ? "Скрыть QR-код" : "Войти через QR-код с телефона"}</span>
                  </button>

                  {/* QR Code Container */}
                  {showQr && (
                    <div className="p-4 bg-neutral-100 rounded-2xl flex flex-col items-center justify-center gap-3 animate-fadeIn">
                      <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-36 h-36"
                          fill="black"
                        >
                          <rect x="0" y="0" width="30" height="30" fill="black" />
                          <rect x="4" y="4" width="22" height="22" fill="white" />
                          <rect x="8" y="8" width="14" height="14" fill="black" />

                          <rect x="70" y="0" width="30" height="30" fill="black" />
                          <rect x="74" y="4" width="22" height="22" fill="white" />
                          <rect x="78" y="8" width="14" height="14" fill="black" />

                          <rect x="0" y="70" width="30" height="30" fill="black" />
                          <rect x="4" y="74" width="22" height="22" fill="white" />
                          <rect x="8" y="78" width="14" height="14" fill="black" />

                          <rect x="36" y="10" width="8" height="8" />
                          <rect x="48" y="10" width="8" height="8" />
                          <rect x="40" y="24" width="12" height="8" />
                          <rect x="10" y="38" width="8" height="12" />
                          <rect x="24" y="40" width="8" height="8" />
                          <rect x="38" y="38" width="24" height="24" rx="4" />
                          <rect x="70" y="40" width="10" height="10" />
                          <rect x="85" y="45" width="8" height="18" />
                          <rect x="40" y="70" width="10" height="10" />
                          <rect x="55" y="75" width="18" height="8" />
                          <rect x="78" y="78" width="12" height="12" />
                        </svg>
                      </div>
                      <p className="text-[11px] text-neutral-500 text-center">
                        Наведите камеру смартфона для быстрого открытия бота
                      </p>
                    </div>
                  )}

                  {/* Pulsing Status & Simulator */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Ожидание нажатия в боте...</span>
                      </div>
                      <button
                        type="button"
                        onClick={initTelegramSession}
                        className="hover:text-black flex items-center gap-1 transition-colors"
                        title="Обновить сессию"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Instant Preview verification button */}
                    <button
                      type="button"
                      onClick={handleSimulateTelegramConfirm}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[11px] text-neutral-700 font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      )}
                      <span>Быстро подтвердить вход (Демо-тест)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* EMAIL AUTH TAB */}
          {activeTab === "email" && (
            <div className="space-y-4">
              {!codeSent ? (
                <form onSubmit={handleSendEmailCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Ваш рабочий Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Получить код для входа</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailCode} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-neutral-700">
                        Код подтверждения
                      </label>
                      <button
                        type="button"
                        onClick={() => setCodeSent(false)}
                        className="text-[11px] text-neutral-500 hover:text-black underline"
                      >
                        Сменить email
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Например: 7742"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-center font-heading text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white"
                    />
                  </div>

                  {demoCodeHint && (
                    <div className="p-2.5 rounded-lg bg-neutral-100 text-center text-xs text-neutral-600">
                      Демо-код: <span className="font-mono font-bold text-black">{demoCodeHint}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Подтвердить и войти</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer inside card */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-[11px] text-neutral-400">
              Входя в систему, вы соглашаетесь с условиями конфиденциальности Apex
            </p>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center py-4 text-xs text-neutral-400">
        © {new Date().getFullYear()} Apex Platform. Все права защищены.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
