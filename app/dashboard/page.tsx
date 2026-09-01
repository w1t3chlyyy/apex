export default function DashboardOverview() {
  const stats = [
    { label: "Сообщений сегодня", value: "128" },
    { label: "Передано человеку", value: "7" },
    { label: "Средняя уверенность RAG", value: "0.82" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Обзор</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-muted text-sm">{s.label}</p>
            <p className="text-2xl font-semibold mt-2 text-accent">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-muted text-sm mt-8">
        Подключите Telegram Business в разделе «Telegram Business» и заполните базу
        знаний, чтобы ассистент начал отвечать клиентам автоматически.
      </p>
    </div>
  );
}
