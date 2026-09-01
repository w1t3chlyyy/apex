"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, Sparkles, Loader2, RotateCcw } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "demo_chat_messages";
const COUNT_KEY = "demo_chat_count";
const MAX_MESSAGES = 6;

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "Здравствуйте! Я нейросетевой ассистент компании. Помогу выбрать тариф, расскажу про подключение к Telegram Business или отвечу на любые вопросы по вашей базе знаний. О чем рассказать?",
  },
];

export default function DemoChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedCount = localStorage.getItem(COUNT_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {
        // ignore
      }
    }
    if (savedCount) setCount(parseInt(savedCount, 10));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const limitReached = count >= MAX_MESSAGES;

  async function sendMessage(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || limitReached || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const nextCount = count + 1;
    setCount(nextCount);
    localStorage.setItem(COUNT_KEY, String(nextCount));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages));

    try {
      const res = await fetch("/api/chat/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      const updated: Message[] = [
        ...nextMessages,
        { role: "assistant", content: data.reply || "Готов помочь! Задайте следующий вопрос." },
      ];
      setMessages(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Произошла временная ошибка сети. Попробуйте еще раз." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const resetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setCount(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COUNT_KEY);
  };

  const quickPrompts = [
    "Как подключить бота?",
    "Сколько стоит тариф?",
    "Что такое база знаний RAG?",
  ];

  return (
    <div className="flex flex-col h-[520px] bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden" id="demo-chat-container">
      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-black ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-black tracking-tight">
                AI Demo Assistant
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-medium">
                Live
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {limitReached ? "Лимит тестовых сообщений исчерпан" : `Осталось ${MAX_MESSAGES - count} из ${MAX_MESSAGES} тестов`}
            </p>
          </div>
        </div>

       

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm bg-neutral-50/30">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-xs sm:text-sm ${
                  isUser
                    ? "bg-black text-white font-medium rounded-tr-sm shadow-sm"
                    : "bg-white border border-neutral-200 text-neutral-900 rounded-tl-sm shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 pl-8 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
            <span>AI генерирует ответ на основе базы знаний...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {!limitReached && messages.length <= 2 && (
        <div className="px-4 py-2.5 border-t border-neutral-100 bg-white flex items-center gap-2 overflow-x-auto">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 hover:bg-black hover:text-white whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3.5 border-t border-neutral-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            className="input-bw flex-1 text-xs sm:text-sm py-2.5 px-3.5 bg-neutral-50 border-neutral-200 rounded-full"
            placeholder={limitReached ? "Лимит исчерпан. Нажмите «Сброс» для повтора" : "Задайте вопрос AI-ассистенту..."}
            value={input}
            disabled={limitReached || loading}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="btn-bw-primary p-2.5 sm:px-4 sm:py-2.5 rounded-full flex items-center justify-center shrink-0"
            disabled={limitReached || loading || !input.trim()}
            aria-label="Отправить вопрос"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
