import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { AuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, code, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Некорректный адрес электронной почты" }, { status: 400 });
    }

    // If code is not provided, we "send" the code (demo verification code)
    if (!code) {
      // In production with Resend/SendGrid this sends a real email. For demo/preview, 
      // we generate a code and return success
      return NextResponse.json({
        success: true,
        message: "Код подтверждения отправлен на почту",
        demoCode: "7742",
      });
    }

    // Verify code
    if (code.trim() !== "7742" && code.trim().length !== 4) {
      return NextResponse.json({ error: "Неверный код подтверждения. Попробуйте 7742" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailName = normalizedEmail.split("@")[0];

    // Стабильный ID — детерминированный хэш от email, один и тот же при
    // каждом входе (раньше был `usr_${Date.now()}`, что при каждом входе
    // создавало нового пользователя и "теряло" настроенного бота).
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
      maxAge: 60 * 60 * 24 * 180, // 180 дней — пользователь дольше остаётся авторизован
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (error) {
    console.error("Email auth error:", error);
    return NextResponse.json({ error: "Ошибка авторизации по почте" }, { status: 500 });
  }
}
