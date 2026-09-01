import { createClient } from "@supabase/supabase-js";

/**
 * Клиент с service_role ключом — используется ТОЛЬКО в серверных route handlers.
 * Никогда не импортируйте этот файл в клиентские компоненты ("use client").
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
