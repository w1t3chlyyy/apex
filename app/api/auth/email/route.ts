import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { AuthUser } from "@/lib/auth";
import { createOtp, verifyOtp } from "@/lib/email-otp-store";
import { sendLoginCodeEmail } from "@/lib/email";
import { SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/session-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, name } = await req.json();

    if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Некорректный адрес электронной почты" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Шаг 1: код не передан — генерируем и отправляем на почту.
    if (!code) {
      const { code: otp, error: cooldownError } = await createOtp(normalizedEmail);
      if (cooldownError || !otp) {
        return NextResponse.json({ error: cooldownError || "Не удалось создать код" }, { status: 429 });
      }

      const result = await sendLoginCodeEmail(normalizedEmail, otp);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || "Не удалось отправить код на почту" },
          { status: 502 }
        );
      }

      return NextResponse.json({ success: true, message: "Код подтверждения отправлен на вашу почту" });
    }

    // Шаг 2: проверяем код.
    const verification = await verifyOtp(normalizedEmail, String(code));
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const emailName = normalizedEmail.split("@")[0];
    const stableId = `usr_${crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 24)}`;

    const user: AuthUser = {
      id: stableId,
      name:
        (typeof name === "string" && name.trim().slice(0, 80)) ||
        emailName.charAt(0).toUpperCase() + emailName.slice(1),
      email: normalizedEmail,
      authMethod: "email",
      createdAt: new Date().toISOString(),
    };

    const response = NextResponse.json({ success: true, user });
    response.cookies.set(SESSION_COOKIE, signSession(user), sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Email auth error:", error);
    return NextResponse.json({ error: "Ошибка авторизации по почте" }, { status: 500 });
  }
}
