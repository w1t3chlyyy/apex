import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect /dashboard and all subroutes
  if (path.startsWith("/dashboard")) {
    const authSession = req.cookies.get("apex_auth_session")?.value;
    const sbToken = req.cookies.get("sb-access-token")?.value;

    if (!authSession && !sbToken) {
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

