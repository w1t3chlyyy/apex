"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "demo_chat_messages";
const COUNT_KEY = "demo_chat_count";
const MAX_MESSAGES = 5;

export default function DemoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedCount = localStorage.getItem(COUNT_KEY);
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedCount) setCount(parseInt(savedCount, 10));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const limitReached = count >= MAX_MESSAGES;

  async function sendMessage() {
    if (!input.trim() || limitReached || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: input }];
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
      const updated: Message[] = [...nextMessages, { role: "assistant", content: data.reply }];
      setMessages(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка запроса. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex items-center gap-2 px-2 pb-3 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-sm text-muted">Демо-ассистент · {MAX_MESSAGES - count} сообщений осталось</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3 px-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted px-2">Спросите что-нибудь, например: «Какие у вас тарифы?»</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-accent text-background" : "bg-surfaceHover text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-muted px-2">Печатает…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <input
          className="input-field flex-1"
          placeholder={limitReached ? "Лимит демо-сообщений исчерпан" : "Напишите сообщение…"}
          value={input}
          disabled={limitReached || loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="btn-primary" disabled={limitReached || loading} onClick={sendMessage}>
          →
        </button>
      </div>
    </div>
  );
}
