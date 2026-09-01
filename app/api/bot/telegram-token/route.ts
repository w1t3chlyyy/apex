import { NextRequest, NextResponse } from "next/server";
import { getBotConfig, updateBotConfig } from "@/lib/bot-config";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export async function GET() {
  const config = await getBotConfig();
  return NextResponse.json({ connected: !!config.telegramToken });
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    // 🔥 ИСПРАВЛЕНИЕ: Проверяем токен через Telegram API перед сохранением
    try {
      const checkResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        return NextResponse.json(
          { error: `Неверный токен: ${errorData.description || "проверьте формат"}` },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Не удалось проверить токен. Проверьте интернет-соединение." },
        { status: 500 }
      );
    }

    // Сохраняем токен в конфигурацию
    await updateBotConfig({ telegramToken: token });

    // Регистрируем вебхук в Telegram
    let webhookSet = false;
    let webhookError: string | undefined;

    if (SITE_URL) {
      try {
        const webhookUrl = `${SITE_URL.replace(/\/$/, "")}/api/bot/webhook`;
        console.log(`[telegram-token] Регистрация вебхука на: ${webhookUrl}`);
        
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
          }),
        });
        
        const data = await res.json();
        webhookSet = !!data.ok;
        
        if (!data.ok) {
          webhookError = data.description;
          console.error(`[telegram-token] Ошибка установки вебхука: ${webhookError}`);
        } else {
          console.log(`[telegram-token] Вебхук успешно установлен!`);
        }
      } catch (err) {
        webhookError = err instanceof Error ? err.message : "unknown error";
        console.error(`[telegram-token] Ошибка при установке вебхука: ${webhookError}`);
      }
    } else {
      webhookError = "NEXT_PUBLIC_SITE_URL не задан в .env — вебхук не был зарегистрирован автоматически";
      console.warn(`[telegram-token] ${webhookError}`);
    }

    return NextResponse.json({
      success: true,
      connected: true,
      webhookSet,
      webhookError,
    });
  } catch (err) {
    console.error("[telegram-token] Ошибка:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
