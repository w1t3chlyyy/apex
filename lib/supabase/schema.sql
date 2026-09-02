-- Миграция: Qwen вместо Gemini + ежемесячные подписки.
-- Выполните этот файл ПОСЛЕ исходного lib/supabase/schema.sql.

-- 1) Эмбеддинги Qwen (text-embedding-v3) имеют размерность 1024, а не 768
--    (как у Gemini text-embedding-004). Столбец нужно пересоздать —
--    старые эмбеддинги несовместимы и базу знаний нужно будет загрузить
--    заново через /dashboard/knowledge-base после миграции.
alter table knowledge_base drop column if exists embedding;
alter table knowledge_base add column embedding vector(1024);

-- Если у вас есть RPC-функция match_knowledge_base — обновите её сигнатуру
-- query_embedding vector(1024) вместо vector(768).

-- 2) Поля ежемесячной подписки в таблице bots (lib/bots.ts, lib/subscriptions.ts)
alter table bots add column if not exists plan_id text;
alter table bots add column if not exists subscription_started_at timestamptz;
alter table bots add column if not exists subscription_expires_at timestamptz;
