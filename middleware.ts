import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Пропускаем все запросы; здесь можно добавить проверку Supabase-сессии
// для приватных разделов /dashboard/*.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
