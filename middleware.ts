import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function b64uToBytes(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Проверка подписи сессии (HMAC-SHA256) через Web Crypto — работает в Edge.
async function isValidSession(token?: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64uToBytes(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!ok) return false;
    const body = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
    return typeof body.exp === "number" && body.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/dashboard")) {
    const valid = await isValidSession(req.cookies.get("apex_auth_session")?.value);
    if (!valid) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
