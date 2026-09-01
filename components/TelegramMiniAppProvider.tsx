"use client";

import { useEffect, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { setClientUser } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { first_name?: string; username?: string; id?: number } };
  expand?: () => void;
  ready?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink?: (url: string) => void;
};

type Status = "checking" | "not-tma" | "authorized" | "unauthorized";

export default function TelegramMiniAppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;

    if (!tg || !tg.initData || tg.initData.length === 0) {
      setStatus("not-tma");
      return;
    }

    tg.ready?.();
    tg.expand?.();
    tg.setHeaderColor?.("#ffffff");
    tg.setBackgroundColor?.("#ffffff");

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (ok && data.user) {
          setClientUser(data.user);
          setStatus("authorized");
        } else {
          setStatus("unauthorized");
        }
      })
      .catch((err) => {
        console.warn("TMA auth check failed:", err);
        setStatus("unauthorized");
      });
  }, []);

  const openRegistration = () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    const url = `${SITE_URL}/login?source=tma`;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="telegram-mini-app-root min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <BrandLogo className="w-12 h-12 mb-6" />
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
          <Lock className="w-6 h-6 text-black" />
        </div>
        <h1 className="text-xl font-heading font-semibold text-black mb-2">
          Вы не авторизованы
        </h1>
        <p className="text-sm text-neutral-600 max-w-xs leading-relaxed mb-8">
          Чтобы открыть личный кабинет, зарегистрируйтесь на сайте — это займёт меньше минуты.
        </p>
        <button
          type="button"
          onClick={openRegistration}
          className="btn-bw-primary px-8 py-3 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Зарегистрироваться на сайте
        </button>
      </div>
    );
  }

  return (
    <div className={status === "authorized" ? "telegram-mini-app-root" : ""}>
      {children}
    </div>
  );
}
