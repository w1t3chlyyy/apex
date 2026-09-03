export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  telegramUsername?: string;
  telegramId?: number;
  photoUrl?: string;
  authMethod: "telegram_bot" | "telegram_miniapp" | "email";
  createdAt: string;
}

export interface TelegramSessionStatus {
  sessionId: string;
  status: "pending" | "confirmed" | "expired";
  user?: AuthUser;
}

const STORAGE_KEY = "apex_auth_user";
const COOKIE_NAME = "apex_auth_session";

// 180 дней — чтобы пользователь не переавторизовывался при каждом визите
// (раньше было 30 дней). Значение синхронизировано с maxAge cookie на
// сервере в app/api/auth/email, app/api/auth/telegram и
// app/api/auth/telegram-session.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function getClientUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setClientUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Пишем тот же полный объект, что вернул сервер, чтобы не затирать
    // email/telegramId урезанной версией.
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(user)
    )}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}
