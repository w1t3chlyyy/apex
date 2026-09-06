import { NextResponse } from "next/server";
import { getPlans } from "@/lib/plans";

export const runtime = "nodejs";

// Публичный, нечувствительный к авторизации эндпоинт со списком тарифов.
// Источник истины — таблица `plans` в Supabase (lib/plans.ts), которую
// редактирует владелец из админ-панели служебного бота
// (app/api/bot/webhook/route.ts). Раньше такого роута не существовало,
// поэтому изменения тарифов из бота никак не попадали на лендинг —
// app/page.tsx показывал захардкоженные карточки тарифов.
//
// Infinity не сериализуется в JSON (превращается в null), поэтому явно
// заменяем его на null и договариваемся, что null на клиенте = «безлимит».
export async function GET() {
  try {
    const plans = await getPlans();

    const serializable = plans
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        priceRub: p.priceRub,
        messagesLimit: Number.isFinite(p.messagesLimit) ? p.messagesLimit : null,
        botsLimit: Number.isFinite(p.botsLimit) ? p.botsLimit : null,
        description: p.description,
        features: p.features,
        highlighted: p.highlighted,
        sortOrder: p.sortOrder,
      }));

    return NextResponse.json({ plans: serializable });
  } catch (err) {
    console.error("[api/plans] Ошибка получения тарифов:", err);
    return NextResponse.json({ plans: [] }, { status: 500 });
  }
}
