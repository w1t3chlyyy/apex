"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState(
    "Ты — вежливый ассистент поддержки интернет-магазина. Отвечай кратко и по делу."
  );
  const [role, setRole] = useState("Поддержка клиентов");
  const [threshold, setThreshold] = useState(0.75);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/bot/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, role, threshold }),
    }).catch(() => {});
    setSaving(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Настройки бота</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="text-sm text-muted mb-1 block">Роль ассистента</label>
          <input className="input-field w-full" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">Системный промпт</label>
          <textarea
            className="input-field w-full h-32 resize-none"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-muted mb-1 block">
            Порог уверенности RAG для автоответа ({threshold.toFixed(2)})
          </label>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <p className="text-xs text-muted mt-1">
            Ниже порога диалог передаётся владельцу с кнопкой «Ответить».
          </p>
        </div>

        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
