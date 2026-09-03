// Реальная отправка писем через SMTP mail.ru — не требует своего домена.
// Раньше код подтверждения никуда не отправлялся — он был захардкожен как
// "7742" и просто показывался в интерфейсе. Теперь письмо отправляется
// с вашего mail.ru-ящика; без настроенных переменных запрос честно
// возвращает ошибку, а не притворяется, что письмо ушло.
//
// НАСТРОЙКА (один раз):
// 1. Зайдите в настройки mail.ru → Безопасность → "Пароли для внешних
//    приложений" (https://id.mail.ru/security/app-passwords) и создайте
//    пароль для типа "Почтовая программа".
// 2. В .env.local укажите:
//      MAILRU_USER=ваш_ящик@mail.ru
//      MAILRU_PASSWORD=пароль_для_внешних_приложений (НЕ обычный пароль от почты)
//      MAILRU_FROM_NAME=Apex (необязательно, отображаемое имя отправителя)

import nodemailer from "nodemailer";

const MAILRU_USER = process.env.MAILRU_USER || "";
const MAILRU_PASSWORD = process.env.MAILRU_PASSWORD || "";
const MAILRU_FROM_NAME = process.env.MAILRU_FROM_NAME || "Apex";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.mail.ru",
      port: 465,
      secure: true, // SSL
      auth: {
        user: MAILRU_USER,
        pass: MAILRU_PASSWORD,
      },
    });
  }
  return cachedTransporter;
}

export async function sendLoginCodeEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!MAILRU_USER || !MAILRU_PASSWORD) {
    console.warn(
      "[email] MAILRU_USER / MAILRU_PASSWORD не заданы в .env — письмо не отправлено"
    );
    return {
      ok: false,
      error: "Отправка email не настроена на сервере (не заданы MAILRU_USER / MAILRU_PASSWORD)",
    };
  }

  try {
    await getTransporter().sendMail({
      from: `"${MAILRU_FROM_NAME}" <${MAILRU_USER}>`,
      to,
      subject: "Код для входа в личный кабинет Apex",
      html: `
        <div style="font-family: sans-serif; padding: 24px;">
          <p>Ваш код для входа в личный кабинет:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
          <p style="color: #666; font-size: 13px;">Код действителен 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
        </div>
      `,
    });

    return { ok: true };
  } catch (err) {
    console.error("[email] Ошибка при отправке письма через SMTP mail.ru:", err);
    return {
      ok: false,
      error:
        "Не удалось отправить письмо. Проверьте MAILRU_USER/MAILRU_PASSWORD — нужен именно пароль для внешних приложений, а не обычный пароль от почты.",
    };
  }
}
