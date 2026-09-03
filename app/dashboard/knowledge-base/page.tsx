"use client";

import { useEffect, useState } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Info,
  Trash2,
  Database,
} from "lucide-react";

interface KbEntry {
  id: string;
  content: string;
  created_at: string;
}

export default function KnowledgeBasePage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadEntries() {
    setEntriesLoading(true);
    try {
      const res = await fetch("/api/rag/list");
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function ingest() {
    if (!text.trim()) return;
    setLoading(true);
    setStatus(null);
    setIsError(false);
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setIsError(true);
        setStatus(data.error || "Ошибка при векторизации. Попробуйте ещё раз.");
        return;
      }

      const warningSuffix = data.warning ? ` ${data.warning}` : "";
      setStatus(
        `Успешно векторизовано и добавлено ${data.chunks ?? 1} фрагментов в базу знаний вашего бота.${warningSuffix}`
      );
      setText("");
      loadEntries();
    } catch {
      setIsError(true);
      setStatus("Ошибка при векторизации. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/rag/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
          База знаний компании (RAG)
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Загрузите информацию о товарах, услугах, ценах и регламентах для автономных ответов
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
            <p className="font-semibold text-black mb-1">Как работает поиск по базе знаний?</p>
            <p>
              Любой загруженный текст автоматически разбивается на семантические блоки и преобразуется в
              векторные эмбеддинги (Qwen text-embedding-v3), привязанные к вашему боту. Когда клиент задаёт
              вопрос в Telegram, ассистент мгновенно находит релевантный фрагмент и формулирует точный ответ.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-black" />
              Текстовый массив данных
            </span>
            <span className="text-xs text-neutral-500 font-normal">
              FAQ, регламенты, прайсы, условия возврата
            </span>
          </label>
          <textarea
            className="w-full bg-white border border-neutral-300 rounded-xl p-4 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all h-64 resize-y leading-relaxed font-sans"
            placeholder="Вставьте сюда любой текстовый контент. Например:
— Доставка: курьером по городу (300 руб, 1-2 часа), самовывоз из офиса (бесплатно).
— Оплата: картой на сайте, безналичный расчёт для юр. лиц.
— Возврат: в течение 14 дней при сохранении товарного вида..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
          <button
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 text-white text-sm font-medium px-6 py-3 rounded-full transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            onClick={ingest}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Векторизация и сохранение…</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Добавить в базу знаний</span>
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
      </div>

      {/* Список уже добавленных записей */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-black" />
          <h3 className="text-base font-semibold text-black">
            Уже добавлено в базу знаний {entries.length > 0 && `(${entries.length})`}
          </h3>
        </div>

        {entriesLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Пока нет ни одной записи. Добавьте текст выше — он появится здесь.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 max-h-[520px] overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed line-clamp-3">
                    {entry.content}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    {new Date(entry.created_at).toLocaleString("ru-RU")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteEntry(entry.id)}
                  disabled={deletingId === entry.id}
                  className="shrink-0 p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Удалить фрагмент"
                >
                  {deletingId === entry.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
