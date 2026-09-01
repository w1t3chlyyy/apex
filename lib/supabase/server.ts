import { createClient } from "@supabase/supabase-js";

/**
 * Клиент с service_role ключом — используется ТОЛЬКО в серверных route handlers.
 * Никогда не импортируйте этот файл в клиентские компоненты ("use client").
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

