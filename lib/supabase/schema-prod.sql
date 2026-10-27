-- Миграция для запуска в прод. Безопасно запускать повторно (всё идемпотентно),
-- данные не удаляются. Выполнить в Supabase → SQL Editor.

-- Вход через Telegram (сессии хранятся в БД, а не в памяти serverless-инстанса)
create table if not exists telegram_login_sessions (
  session_id text primary key,
  status text not null default 'pending',
  user_data jsonb,
  created_at timestamptz not null default now()
);

-- Коды входа по email (хранятся хешем)
create table if not exists email_otps (
  email text primary key,
  code_hash text not null,
  created_at timestamptz not null default now(),
  attempts integer not null default 0
);

-- Состояние многошаговых сценариев служебного бота
create table if not exists pending_actions (
  key text primary key,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Счётчики: токены бесплатного тарифа и ответы ИИ по платному тарифу
alter table bots add column if not exists free_tokens_used integer not null default 0;
alter table bots add column if not exists ai_replies_used integer not null default 0;
alter table bots add column if not exists ai_replies_period_start timestamptz;

-- RLS: приложение работает через service_role (он RLS обходит). Без политик
-- anon-ключ (он публичный) не сможет читать токены ботов, переписки и сессии.
alter table telegram_login_sessions enable row level security;
alter table email_otps enable row level security;
alter table pending_actions enable row level security;
alter table bots enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_base enable row level security;
alter table profiles enable row level security;
alter table plans enable row level security;
