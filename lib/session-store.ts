import type { AuthUser } from "./auth";

interface TelegramLoginSession {
  sessionId: string;
  createdAt: number;
  status: "pending" | "confirmed" | "expired";
  user?: AuthUser;
}

// Global in-memory cache for server sessions
const globalSessions = globalThis as unknown as {
  __apexTelegramSessions?: Map<string, TelegramLoginSession>;
};

if (!globalSessions.__apexTelegramSessions) {
  globalSessions.__apexTelegramSessions = new Map<string, TelegramLoginSession>();
}

export const telegramSessions = globalSessions.__apexTelegramSessions;

export function createTelegramSession(sessionId: string): TelegramLoginSession {
  const session: TelegramLoginSession = {
    sessionId,
    createdAt: Date.now(),
    status: "pending",
  };
  telegramSessions.set(sessionId, session);
  return session;
}

export function getTelegramSession(sessionId: string): TelegramLoginSession | undefined {
  const session = telegramSessions.get(sessionId);
  if (!session) return undefined;
  // Expire after 10 minutes
  if (Date.now() - session.createdAt > 10 * 60 * 1000) {
    session.status = "expired";
  }
  return session;
}

export function confirmTelegramSession(
  sessionId: string,
  user: AuthUser
): TelegramLoginSession | null {
  const session = getTelegramSession(sessionId);
  if (!session || session.status === "expired") return null;

  session.status = "confirmed";
  session.user = user;
  telegramSessions.set(sessionId, session);
  return session;
}
