import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("apex_auth_session")?.value;
  if (!cookie) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    const user = JSON.parse(cookie);
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set("apex_auth_session", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
