import crypto from "crypto";
import { SESSION_MAX_AGE_SECONDS, type AuthUser } from "./auth";

export const SESSION_COOKIE = "apex_auth_session";

function getSecret(): string {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new Error("SESSION_SECRET не задан или короче 16 символов");
  return s;
}

function hmac(payload: string): Buffer {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest();
}

/** Подписанный токен сессии: base64url(payload).base64url(HMAC-SHA256). */
export function signSession(user: AuthUser): string {
  const body = { u: user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${payload}.${hmac(payload).toString("base64url")}`;
}

export function verifySession(token?: string | null): AuthUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = hmac(parts[0]);
    const got = Buffer.from(parts[1], "base64url");
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
    const body = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!body?.u?.id || typeof body.exp !== "number" || body.exp < Date.now() / 1000) return null;
    return body.u as AuthUser;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
