// Реальная отправка писем через Resend (https://resend.com).
// Раньше код подтверждения никуда не отправлялся — он был захардкожен как
// "7742" и просто показывался в интерфейсе. Теперь письмо отправляется
// по-настоящему; без RESEND_API_KEY запрос честно возвращает ошибку, а не
// притворяется, что письмо ушло.

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";

export async function sendLoginCodeEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn(
      "[email] RESEND_API_KEY / RESEND_FROM_EMAIL не заданы в .env — письмо не отправлено"
    );
    return {
      ok: false,
      error: "Отправка email не настроена на сервере (не заданы RESEND_API_KEY / RESEND_FROM_EMAIL)",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject: "Код для входа в личный кабинет Apex",
        html: `
          <div style="font-family: sans-serif; padding: 24px;">
            <p>Ваш код для входа в личный кабинет:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
            <p style="color: #666; font-size: 13px;">Код действителен 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`[email] Resend error ${res.status}: ${details}`);
      return { ok: false, error: `Почтовый сервис вернул ошибку (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Ошибка при отправке письма:", err);
    return { ok: false, error: "Сетевая ошибка при отправке письма" };
  }
}
