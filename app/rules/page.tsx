const rules = [
  'Участие в игре бесплатное.',
  'Один участник может открыть одну коробку в день.',
  'Баллы можно использовать при покупке мебели RichHouse по условиям акции.',
  'Билеты участвуют в розыгрышах RichHouse.',
  'Призы не гарантируются каждому участнику.',
  'RichHouse может проверять участников на накрутку и блокировать подозрительные аккаунты.',
];

export default function RulesPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <section style={{ maxWidth: 860, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c8a15a' }}>Назад</a>
        <p style={{ color: '#c8a15a', letterSpacing: 2, textTransform: 'uppercase', marginTop: 34 }}>Правила акции</p>
        <h1 style={{ fontSize: 48, lineHeight: 1, margin: '14px 0 24px' }}>RichHouse Деньги в Дом</h1>
        <p style={{ fontSize: 20, lineHeight: 1.5, color: '#e8dcc8' }}>Это базовая публичная версия правил. Перед большим запуском финальный текст должен проверить юрист.</p>
        <div style={{ display: 'grid', gap: 12, marginTop: 34 }}>
          {rules.map((rule, index) => (
            <div key={rule} style={{ padding: 18, borderRadius: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(200,161,90,.25)' }}>
              <b style={{ color: '#c8a15a' }}>{index + 1}. </b>{rule}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
