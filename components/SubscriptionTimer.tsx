"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "Истекла";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} дн. ${hours} ч. ${minutes} мин.`;
  if (hours > 0) return `${hours} ч. ${minutes} мин. ${seconds} сек.`;
  return `${minutes} мин. ${seconds} сек.`;
}

export default function SubscriptionTimer({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) {
    return <span className="text-xs text-neutral-500">Подписка не активна</span>;
  }

  const msRemaining = new Date(expiresAt).getTime() - now;
  const expired = msRemaining <= 0;

  return (
    <span className={`text-xs ${expired ? "text-rose-600 font-semibold" : "text-neutral-600"}`}>
      {expired ? "Подписка истекла" : `До продления: ${formatRemaining(msRemaining)}`}
    </span>
  );
}
