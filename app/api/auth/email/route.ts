import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { AuthUser } from "@/lib/auth";
import { createOtp, verifyOtp } from "@/lib/email-otp-store";
import { sendLoginCodeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, name } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Некорректный адрес электронной почты" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Шаг 1: код не передан — генерируем и реально отправляем на почту.
    // Раньше здесь возвращался хардкод "7742" без какой-либо отправки.
    if (!code) {
      const { code: otp, error: cooldownError } = createOtp(normalizedEmail);

      if (cooldownError) {
        return NextResponse.json({ error: cooldownError }, { status: 429 });
      }

      const result = await sendLoginCodeEmail(normalizedEmail, otp);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || "Не удалось отправить код на почту" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Код подтверждения отправлен на вашу почту",
      });
    }

    // Шаг 2: проверяем код против того, что реально сгенерировали и
    // отправили. Раньше любой 4-значный код проходил проверку — это
    // позволяло войти в любой аккаунт, зная только email.
    const verification = verifyOtp(normalizedEmail, String(code));
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const emailName = normalizedEmail.split("@")[0];

    // Стабильный ID — детерминированный хэш от email, один и тот же при
    // каждом входе.
    const stableId = `usr_${crypto
      .createHash("sha256")
      .update(normalizedEmail)
      .digest("hex")
      .slice(0, 24)}`;

    const user: AuthUser = {
      id: stableId,
      name: name?.trim() || emailName.charAt(0).toUpperCase() + emailName.slice(1),
      email: normalizedEmail,
      authMethod: "email",
      createdAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set("apex_auth_session", JSON.stringify(user), {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error("Email auth error:", error);
    return NextResponse.json({ error: "Ошибка авторизации по почте" }, { status: 500 });
  }
}
