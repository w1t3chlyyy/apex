"use client";

import { useState } from "react";
import { Sliders, Save, CheckCircle2, Shield, MessageSquare, HelpCircle, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState(
    "Ты — вежливый и компетентный ассистент компании. Отвечай точно по предоставленной базе знаний, помогай клиентам с выбором и оформлением заявок. Если информации недостаточно, предложи позвать старшего менеджера."
  );
  const [role, setRole] = useState("Эксперт по продажам и клиентской поддержке");
  const [threshold, setThreshold] = useState(0.75);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/bot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, role, threshold }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // fallback
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-black tracking-tight">
          Настройки AI-ассистента
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Сконфигурируйте поведение, роль и логику эскалации нейросети
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Role */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-black" />
            Роль и позиционирование
          </label>
          <input
            className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-3 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Например: Эксперт по продажам и консультант"
          />
          <p className="text-xs text-neutral-500 mt-1.5">
            Определяет тон общения и манеру подачи ответов клиентам.
          </p>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-black" />
            Системный промпт (Инструкция для ИИ)
          </label>
          <textarea
            className="w-full bg-white border border-neutral-300 rounded-xl p-4 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all h-36 resize-y leading-relaxed font-sans"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Опишите правила ведения диалога, запрещенные темы и ключевые призывы к действию..."
          />
          <p className="text-xs text-neutral-500 mt-1.5">
            Детальные директивы модели. Чем точнее инструкции, тем надежнее бот следует вашим стандартам.
          </p>
        </div>

        {/* Confidence Threshold */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-black" />
              Порог уверенности RAG для автоответа
            </label>
            <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-md font-mono">
              {threshold.toFixed(2)}
            </span>
          </div>
          
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
          
          {/* flex-wrap + gap не даёт подписям переноситься криво на очень узких экранах */}
          <div className="flex flex-wrap justify-between gap-1 text-[11px] text-neutral-500 mt-1 font-mono">
            <span>0.50 (Больше свободы)</span>
            <span>0.75 (Рекомендуемый баланс)</span>
            <span>0.95 (Строго по базе)</span>
          </div>
          
          <p className="text-xs text-neutral-600 mt-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            Если семантическое соответствие найденного ответа в базе знаний ниже {threshold.toFixed(2)}, бот не фантазирует, а отправляет вежливое уведомление и передает диалог живому менеджеру.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
          <button
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 text-white text-sm font-medium px-6 py-3 rounded-full transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            onClick={save}
            disabled={saving}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Настройки сохранены</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? "Сохранение…" : "Сохранить параметры"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
