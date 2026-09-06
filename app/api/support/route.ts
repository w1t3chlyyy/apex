import { NextRequest, NextResponse } from "next/server";
import { notifySupportRequest } from "@/lib/admin";

export const runtime = "nodejs";

const SERVICE_BOT_TOKEN = process.env.TELEGRAM_SERVICE_BOT_TOKEN || "";

// Приём заявок с публичного блока поддержки сайта (components/SupportContact.tsx).
// Заявка уходит в служебный бот, но только администраторам сервиса
// (ADMIN_TELEGRAM_IDS) — см. lib/admin.ts:notifySupportRequest.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.slice(0, 200) : "";
    const contact = typeof body?.contact === "string" ? body.contact.trim().slice(0, 200) : "";
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";

    if (!contact || !message) {
      return NextResponse.json(
        { error: "Заполните контакт и сообщение" },
        { status: 400 }
      );
    }

    if (!SERVICE_BOT_TOKEN) {
      console.warn("[support] TELEGRAM_SERVICE_BOT_TOKEN не настроен — заявка не отправлена");
      return NextResponse.json(
        { error: "Служба поддержки временно недоступна, попробуйте написать в Telegram напрямую" },
        { status: 503 }
      );
    }

    const result = await notifySupportRequest(SERVICE_BOT_TOKEN, { name, contact, message });

    if (!result.delivered) {
      console.warn("[support] Не удалось доставить заявку: нет настроенных админов");
      return NextResponse.json(
        { error: "Служба поддержки временно недоступна, попробуйте написать в Telegram напрямую" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support] Ошибка обработки заявки:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
