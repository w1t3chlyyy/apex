import { NextRequest } from "next/server";
import type { AuthUser } from "./auth";

/**
 * Достаёт текущего авторизованного пользователя личного кабинета из cookie
 * `apex_auth_session` (её ставит /api/auth/session, /api/auth/email,
 * /api/auth/telegram и т.д.). Используется в API-роутах, которые должны
 * работать с сущностями, привязанными к конкретному пользователю
 * (например, "бот текущего пользователя").
 */
export function getCurrentUserFromRequest(req: NextRequest): AuthUser | null {
  const cookie = req.cookies.get("apex_auth_session")?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as AuthUser;
  } catch {
    return null;
  }
}
