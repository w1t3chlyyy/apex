"use client";

import { useState } from "react";

export default function TelegramPage() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await fetch("/api/bot/telegram-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setStatus("Токен сохранён. Сервисный бот подключит Telegram Business в течение минуты.");
    } catch {
      setStatus("Не удалось сохранить токен.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Telegram Business</h1>
      <div className="card p-6 space-y-4">
        <p className="text-sm text-muted">
          Вставьте Bot API Token вашего бота, подключённого к Telegram Business
          (получен через @BotFather). Токен хранится в зашифрованном виде и
          используется только сервисным ботом для отправки сообщений от вашего имени.
        </p>
        <input
          className="input-field w-full"
          placeholder="123456789:AAExampleTokenHere"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="btn-primary" onClick={save} disabled={saving || !token}>
          {saving ? "Сохранение…" : "Подключить"}
        </button>
        {status && <p className="text-sm text-accent">{status}</p>}
      </div>
    </div>
  );
}
