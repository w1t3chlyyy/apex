import DemoChat from "@/components/DemoChat";

const PLANS = [
  {
    name: "Старт",
    price: "990₽/мес",
    features: ["1 бот", "500 сообщений/мес", "База знаний до 20 страниц", "Telegram Business"],
  },
  {
    name: "Про",
    price: "2 990₽/мес",
    features: ["3 бота", "5 000 сообщений/мес", "Безлимитная база знаний", "Приоритетная поддержка"],
    highlighted: true,
  },
  {
    name: "Бизнес",
    price: "по запросу",
    features: ["Неограниченно ботов", "Выделенная инфраструктура", "SLA", "Персональный менеджер"],
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="w-2 h-2 rounded-full bg-accent shadow-glow" />
          AI Business Assistant
        </div>
        <a href="/dashboard" className="btn-secondary text-sm">Войти в кабинет</a>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            ИИ-ассистент прямо в вашем{" "}
            <span className="text-accent">Telegram Business</span>
          </h1>
          <p className="mt-5 text-muted text-lg">
            Отвечает клиентам мгновенно на основе вашей базы знаний. Если не уверен —
            передаёт диалог вам с одной кнопкой. Настройка за 5 минут, без разработчиков.
          </p>
          <div className="mt-8 flex gap-4">
            <a href="/dashboard" className="btn-primary">Начать бесплатно</a>
            <a href="#pricing" className="btn-secondary">Тарифы</a>
          </div>
        </div>

        <div className="card p-4 shadow-glow">
          <DemoChat />
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-semibold text-center mb-10">Тарифы</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card p-6 flex flex-col ${plan.highlighted ? "border-accent shadow-glow" : ""}`}
            >
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-3xl font-semibold mt-2">{plan.price}</p>
              <ul className="mt-6 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-muted flex items-center gap-2">
                    <span className="text-accent">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/dashboard" className={plan.highlighted ? "btn-primary mt-6 text-center" : "btn-secondary mt-6 text-center"}>
                Выбрать
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
