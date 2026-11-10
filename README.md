# AI Business Assistant — Site & Mini App

Next.js 14 (App Router) фронтенд + Telegram Mini App + личный кабинет.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполните переменные
npm run dev
```

## Вход через Telegram-бота

В production задайте в Vercel:

- `TELEGRAM_SERVICE_BOT_TOKEN` — токен служебного бота.
- `TELEGRAM_WEBHOOK_SECRET` — случайный секрет из символов `A-Z`, `a-z`, `0-9`, `_` и `-`.
- `SESSION_SECRET` — случайный секрет для подписи сессий. Создайте командой `openssl rand -hex 32`.
- `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` — постоянное хранилище Telegram-сессий.
- `TELEGRAM_BOT_USERNAME` — username того же служебного бота, без `@`.

Установите вебхук служебного бота на этот Next.js-сайт, а не на FastAPI-сервис:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_SERVICE_BOT_TOKEN}/setWebhook" \
  -d "url=${NEXT_PUBLIC_SITE_URL}/api/bot/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d 'allowed_updates=["message","callback_query"]'
```

`TELEGRAM_WEBHOOK_SECRET` должен совпадать с `secret_token` вебхука. Не направляйте служебного бота на `/webhook/service` FastAPI-сервиса: обработчик входа находится в `app/api/bot/webhook`.

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
