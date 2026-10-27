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

// 180 дней. Cookie сессии выдаёт ТОЛЬКО сервер (подписанная, httpOnly) —
// см. lib/session-token.ts. Клиент хранит лишь копию профиля для отображения.
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
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}
