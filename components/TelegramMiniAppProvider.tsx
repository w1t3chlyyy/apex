"use client";

import { useEffect, useState } from "react";
import { setClientUser } from "@/lib/auth";

export default function TelegramMiniAppProvider({ children }: { children: React.ReactNode }) {
  const [isTMA, setIsTMA] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          initData?: string;
          initDataUnsafe?: { user?: { first_name?: string; username?: string; id?: number } };
          expand?: () => void;
          ready?: () => void;
          setHeaderColor?: (color: string) => void;
          setBackgroundColor?: (color: string) => void;
        };
      };
    }).Telegram?.WebApp;

    if (tg && tg.initData && tg.initData.length > 0) {
      setIsTMA(true);
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#ffffff");

      // Auto-authenticate with backend
      fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setClientUser(data.user);
          }
        })
        .catch((err) => {
          console.warn("TMA Auto-auth skipped:", err);
        });
    }
  }, []);

  return (
    <div className={isTMA ? "telegram-mini-app-root" : ""}>
      {children}
    </div>
  );
}
