-- Выполните этот файл в Supabase SQL Editor (или через миграции), чтобы
-- session-store.ts и bot-config.ts могли персистентно хранить данные —
-- без этого на Vercel serverless токен бота и login-сессии будут теряться
-- между вызовами разных lambda-инстансов (см. CHANGELOG.md).

-- Профили Telegram-пользователей (уже использовалось в lib/telegram-registry.ts)
create table if not exists profiles (
  telegram_id bigint primary key,
  username text,
  first_name text
);

-- Сессии логина через Telegram-бота (флоу на /login)
create table if not exists telegram_login_sessions (
  session_id text primary key,
  status text not null default 'pending',
  session_user jsonb,
  created_at timestamptz not null default now()
);

-- Автоматическая очистка старых сессий не обязательна (TTL проверяется в коде),
-- но можно периодически чистить таблицу вручную/по крону:
-- delete from telegram_login_sessions where created_at < now() - interval '1 day';

-- Единая строка конфигурации бота: токен, системный промпт, роль, порог RAG.
-- id всегда = 1 (singleton row), обновляется через upsert.
create table if not exists bot_config (
  id int primary key default 1,
  telegram_token text,
  system_prompt text,
  role text,
  threshold numeric
);

-- База знаний RAG (уже использовалась в app/api/rag/ingest/route.ts).
-- Требует расширение pgvector: create extension if not exists vector;
create extension if not exists vector;

create table if not exists knowledge_base (
  id bigserial primary key,
  bot_id text,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);
