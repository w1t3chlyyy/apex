import { NextRequest } from "next/server";
import type { AuthUser } from "./auth";
import { SESSION_COOKIE, verifySession } from "./session-token";

/**
 * Текущий пользователь личного кабинета из ПОДПИСАННОЙ httpOnly cookie.
 * Подделать или подменить её на клиенте нельзя.
 */
export function getCurrentUserFromRequest(req: NextRequest): AuthUser | null {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}
