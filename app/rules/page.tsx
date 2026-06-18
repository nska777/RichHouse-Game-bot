const rules = [
  { title: 'Участие бесплатное', text: 'Участник не платит за вход в игру. Все призы, баллы и билеты предоставляются RichHouse в рамках акции.' },
  { title: 'Одна коробка в день', text: 'Каждый участник может открыть коробку дня один раз в календарные сутки.' },
  { title: 'Телефон обязателен', text: 'Номер нужен для закрепления баллов, связи менеджера и подтверждения победителя.' },
  { title: 'Баллы к покупке', text: 'Баллы могут использоваться при покупке мебели RichHouse по условиям действующей акции.' },
  { title: 'Билеты на розыгрыш', text: 'Билеты повышают шанс участника в розыгрышах. Наличие билетов не гарантирует победу.' },
  { title: 'Проверка честности', text: 'RichHouse может проверять участников на дубли, накрутку и подозрительную активность.' },
];

const notes = [
  'Финальные условия призов и сроков акции утверждаются компанией RichHouse.',
  'При крупном рекламном запуске юридический текст правил нужно утвердить отдельно.',
  'Менеджер может начислять дополнительные бонусы за визит в салон или покупку мебели.',
];

export default function RulesPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '44px 20px 86px' }}>
      <section style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <a href="/" style={{ color: '#c8a15a', textDecoration: 'none' }}>← Главная</a>
          <a href="/game" style={{ color: '#dbe1e5', textDecoration: 'none', border: '1px solid rgba(220,226,232,.18)', borderRadius: 999, padding: '10px 16px' }}>Механика</a>
        </div>

        <div style={{ marginTop: 60, border: '1px solid rgba(220,226,232,.13)', borderRadius: 34, padding: '42px 38px', background: 'linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.025))', boxShadow: '0 30px 90px rgba(0,0,0,.28)' }}>
          <p style={{ color: '#c8a15a', letterSpacing: 4, textTransform: 'uppercase', margin: 0 }}>Official Conditions</p>
          <h1 style={{ fontSize: 'clamp(42px, 6vw, 74px)', lineHeight: .95, letterSpacing: '-0.055em', margin: '22px 0' }}>Правила RichHouse Client Club</h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, color: '#dbe1e5', maxWidth: 760, margin: 0 }}>
            Краткая публичная версия правил для клиентов. Тон — серьёзный и прозрачный: участие бесплатное, призы от RichHouse, баллы используются только по условиям акции.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 28 }}>
          {rules.map((rule, index) => (
            <div key={rule.title} style={{ padding: 24, borderRadius: 24, background: 'rgba(13,18,24,.42)', border: '1px solid rgba(200,161,90,.22)' }}>
              <div style={{ color: '#c8a15a', fontSize: 13, letterSpacing: 2 }}>0{index + 1}</div>
              <h3 style={{ fontSize: 24, margin: '16px 0 10px' }}>{rule.title}</h3>
              <p style={{ color: '#b8c1c9', lineHeight: 1.55, margin: 0 }}>{rule.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, border: '1px solid rgba(220,226,232,.12)', borderRadius: 28, padding: 28, background: 'rgba(255,255,255,.035)' }}>
          <h2 style={{ marginTop: 0 }}>Важные примечания</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {notes.map((item) => (
              <div key={item} style={{ color: '#dbe1e5', lineHeight: 1.55, borderLeft: '2px solid #c8a15a', paddingLeft: 14 }}>{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
