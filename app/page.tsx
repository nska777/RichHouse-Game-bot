const prizes = [
  'Ежедневный денежный приз от RichHouse',
  'Баллы на покупку мебели',
  'Билеты на еженедельный розыгрыш',
  'Подарки к покупке: доставка, сборка, декор',
];

export default function HomePage() {
  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '#';

  return (
    <main style={{ minHeight: '100vh', padding: '48px 20px' }}>
      <section style={{ maxWidth: 1040, margin: '0 auto' }}>
        <p style={{ color: '#c8a15a', letterSpacing: 2, textTransform: 'uppercase' }}>RichHouse Game</p>
        <h1 style={{ fontSize: 56, lineHeight: 1, margin: '18px 0' }}>Деньги в Дом</h1>
        <p style={{ maxWidth: 720, fontSize: 22, lineHeight: 1.45, color: '#e8dcc8' }}>
          Открывайте коробку RichHouse каждый день, копите баллы и билеты, участвуйте в розыгрышах и используйте бонусы при покупке мебели.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 32 }}>
          <a href={botUrl} style={{ background: '#c8a15a', color: '#15100c', padding: '16px 24px', borderRadius: 16, fontWeight: 700 }}>Играть в Telegram</a>
          <a href="/admin" style={{ border: '1px solid #c8a15a', padding: '16px 24px', borderRadius: 16 }}>Админка</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 56 }}>
          {prizes.map((item) => (
            <div key={item} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(200,161,90,.35)', borderRadius: 24, padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>{item}</h3>
              <p style={{ color: '#d7c7ad' }}>Участие бесплатное. Баллы начисляются за активность и покупку мебели.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
