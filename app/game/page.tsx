const steps = [
  { title: 'Вход через Telegram', text: 'Клиент запускает бота и закрепляет номер телефона. Это защищает от пустых кликов и собирает базу.' },
  { title: 'Коробка дня', text: 'Один раз в день участник получает баллы, билеты или специальный бонус от RichHouse.' },
  { title: 'Заявка менеджеру', text: 'Кнопка «Получить подборку» превращает интерес в обращение и отправляет лид в рабочую группу.' },
  { title: 'Продажа и бонусы', text: 'Менеджер может начислить дополнительные баллы за визит в салон или покупку мебели.' },
];

const rewards = [
  { title: 'Баллы', value: 'для покупки', text: 'Накопленный бонус усиливает мотивацию прийти в салон и выбрать мебель.' },
  { title: 'Билеты', value: 'для розыгрыша', text: 'Чем больше билетов, тем выше шанс получить приз от RichHouse.' },
  { title: 'Подарки', value: 'к заказу', text: 'Доставка, сборка, декор или персональные условия могут использоваться как призы.' },
];

export default function GamePage() {
  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '#';

  return (
    <main style={{ minHeight: '100vh', padding: '44px 20px 86px' }}>
      <section style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <a href="/" style={{ color: '#c8a15a', textDecoration: 'none' }}>← Главная</a>
          <a href="/rules" style={{ color: '#dbe1e5', textDecoration: 'none', border: '1px solid rgba(220,226,232,.18)', borderRadius: 999, padding: '10px 16px' }}>Правила</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr .9fr', gap: 42, alignItems: 'center', marginTop: 58 }}>
          <div>
            <p style={{ color: '#c8a15a', letterSpacing: 4, textTransform: 'uppercase', margin: 0 }}>RichHouse Mechanics</p>
            <h1 style={{ fontSize: 'clamp(48px, 6vw, 86px)', lineHeight: .95, letterSpacing: '-0.055em', margin: '22px 0' }}>Система ежедневного возврата клиента</h1>
            <p style={{ fontSize: 21, lineHeight: 1.6, color: '#dbe1e5', maxWidth: 680, margin: 0 }}>
              Это не развлекательная игра ради кликов. Это серьёзная механика удержания: клиент возвращается каждый день, копит бонусы и оставляет заявку на подбор мебели.
            </p>
            <a href={botUrl} style={{ display: 'inline-block', marginTop: 30, background: 'linear-gradient(135deg, #d7b56f, #a97c38)', color: '#111820', padding: '17px 26px', borderRadius: 14, fontWeight: 800, textDecoration: 'none' }}>Запустить в Telegram</a>
          </div>

          <div style={{ border: '1px solid rgba(220,226,232,.14)', borderRadius: 34, padding: 28, background: 'linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.025))', boxShadow: '0 30px 90px rgba(0,0,0,.34)' }}>
            <div style={{ height: 420, borderRadius: 28, background: 'linear-gradient(160deg, #202832, #111820 62%, #2a2118)', border: '1px solid rgba(200,161,90,.26)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#c8a15a', letterSpacing: 3, textTransform: 'uppercase', fontSize: 12 }}>Client Journey</div>
                <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
                  {['Telegram', 'Phone verified', 'Daily box', 'Lead created'].map((item, index) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.055)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 99, display: 'grid', placeItems: 'center', background: index === 3 ? '#c8a15a' : 'rgba(200,161,90,.15)', color: index === 3 ? '#111820' : '#c8a15a', fontWeight: 800 }}>{index + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ color: '#aeb8c2', fontSize: 14 }}>Цель: не просмотры, а заявки, визиты в салон и продажи мебели.</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 70 }}>
          {rewards.map((item) => (
            <div key={item.title} style={{ border: '1px solid rgba(200,161,90,.24)', borderRadius: 26, padding: 24, background: 'rgba(255,255,255,.045)' }}>
              <div style={{ color: '#c8a15a', textTransform: 'uppercase', letterSpacing: 3, fontSize: 12 }}>{item.value}</div>
              <h3 style={{ fontSize: 26, margin: '16px 0 10px' }}>{item.title}</h3>
              <p style={{ color: '#b8c1c9', lineHeight: 1.55, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 70, fontSize: 38 }}>Путь клиента</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          {steps.map((step, index) => (
            <div key={step.title} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 18, padding: 22, borderRadius: 24, background: 'rgba(13,18,24,.42)', border: '1px solid rgba(220,226,232,.12)' }}>
              <div style={{ color: '#c8a15a', fontSize: 28, fontWeight: 900 }}>0{index + 1}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 23 }}>{step.title}</h3>
                <p style={{ color: '#b8c1c9', lineHeight: 1.55, margin: '8px 0 0' }}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
