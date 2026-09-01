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
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ id: user.id, name: user.name, authMethod: user.authMethod })
    )}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }
}
