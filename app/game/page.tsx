const steps = [
  'Откройте коробку дня в Telegram',
  'Получите баллы и билеты',
  'Участвуйте в ежедневном розыгрыше',
  'Используйте баллы при покупке мебели',
];

export default function GamePage() {
  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '#';

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c8a15a' }}>Назад</a>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 28, alignItems: 'center', marginTop: 30 }}>
          <div>
            <p style={{ color: '#c8a15a', letterSpacing: 2, textTransform: 'uppercase' }}>Ежедневная игра</p>
            <h1 style={{ fontSize: 58, lineHeight: 1, margin: '14px 0' }}>Открой коробку RichHouse</h1>
            <p style={{ fontSize: 22, lineHeight: 1.5, color: '#e8dcc8' }}>Каждый день в коробке: баллы, билеты, подарки и шанс выиграть приз на обновление интерьера.</p>
            <a href={botUrl} style={{ display: 'inline-block', marginTop: 24, background: '#c8a15a', color: '#15100c', padding: '16px 24px', borderRadius: 16, fontWeight: 800 }}>Играть в Telegram</a>
          </div>
          <div style={{ minHeight: 360, borderRadius: 36, border: '1px solid rgba(200,161,90,.45)', background: 'rgba(200,161,90,.12)', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 210, height: 210, borderRadius: 36, background: '#c8a15a', color: '#15100c', display: 'grid', placeItems: 'center', fontSize: 72, fontWeight: 900 }}>BOX</div>
          </div>
        </div>

        <h2 style={{ marginTop: 54 }}>Как участвовать</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {steps.map((step, index) => (
            <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, borderRadius: 18, background: 'rgba(255,255,255,.04)' }}>
              <b style={{ color: '#c8a15a' }}>{index + 1}</b>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
