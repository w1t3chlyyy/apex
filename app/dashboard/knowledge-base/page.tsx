"use client";

import { useState } from "react";

export default function KnowledgeBasePage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ingest() {
    if (!text.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setStatus(`Добавлено ${data.chunks ?? 0} фрагментов в базу знаний.`);
      setText("");
    } catch {
      setStatus("Ошибка при загрузке. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">База знаний</h1>
      <div className="card p-6 space-y-4">
        <p className="text-sm text-muted">
          Вставьте FAQ, описание услуг или любой текст. Он будет нарезан на фрагменты
          и векторизован (Gemini text-embedding-004) для поиска через pgvector.
        </p>
        <textarea
          className="input-field w-full h-56 resize-none"
          placeholder="Например: Доставка занимает 2-3 дня по всей России..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary" onClick={ingest} disabled={loading}>
          {loading ? "Загрузка…" : "Добавить в базу знаний"}
        </button>
        {status && <p className="text-sm text-accent">{status}</p>}
      </div>
    </div>
  );
}
