# AI Business Assistant — Site & Mini App

Next.js 14 (App Router) фронтенд + Telegram Mini App + личный кабинет.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполните переменные
npm run dev
```

## Структура

- `app/page.tsx` — лендинг с демо-чатом (лимит 5 сообщений/сессию, хранится в localStorage)
- `app/dashboard/*` — личный кабинет (настройки бота, база знаний/RAG, Telegram Business)
- `app/api/chat/demo/route.ts` — API демо-чата (Gemini)
- `app/api/rag/ingest/route.ts` — нарезка и векторизация текста для базы знаний (pgvector)
- `app/api/auth/telegram/route.ts` — проверка `initData` Telegram Mini App и вход через Supabase
- `lib/` — клиенты Supabase, Gemini, валидация Telegram initData
- `components/DemoChat.tsx`, `components/Sidebar.tsx`

## Заметки по безопасности

- Все серверные ключи (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) используются
  только в серверных route handlers, никогда не попадают в клиентский бандл.
- `verifyTelegramInitData` проверяет HMAC-подпись `initData` по алгоритму Telegram
  (см. `lib/telegram-auth.ts`) перед выдачей сессии Supabase.
