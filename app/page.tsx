const advantages = [
  { value: '01', title: 'Ежедневная коробка', text: 'Один вход в день. Участник получает баллы, билеты или специальный бонус RichHouse.' },
  { value: '02', title: 'База клиентов', text: 'Перед участием бот закрепляет номер телефона, чтобы менеджер мог работать с реальным лидом.' },
  { value: '03', title: 'Продажи мебели', text: 'Баллы усиливают интерес к покупке, а заявки сразу уходят менеджеру в Telegram.' },
];

const mechanics = [
  'Бонусы начисляются за активность, визит в салон и покупку мебели.',
  'Билеты повышают шанс в розыгрыше призов RichHouse.',
  'Менеджер видит заявки, статусы и может выгружать базу в CSV.',
];

export default function HomePage() {
  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '#';

  return (
    <main style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <section style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '56px 20px 90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 80 }}>
          <div>
            <div style={{ color: '#c8a15a', letterSpacing: 4, textTransform: 'uppercase', fontSize: 13 }}>RichHouse Client Club</div>
            <div style={{ color: '#aeb8c2', marginTop: 8, fontSize: 14 }}>закрытая бонусная механика для покупателей мебели</div>
          </div>
          <a href="/rules" style={{ border: '1px solid rgba(200,161,90,.35)', borderRadius: 999, padding: '12px 18px', color: '#e9d7b7', textDecoration: 'none' }}>Правила участия</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 44, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid rgba(200,161,90,.3)', borderRadius: 999, padding: '10px 14px', color: '#d8c49d', background: 'rgba(255,255,255,.035)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: '#c8a15a', display: 'inline-block' }} />
              Участие бесплатное. Призы от RichHouse.
            </div>
            <h1 style={{ fontSize: 'clamp(54px, 7vw, 104px)', lineHeight: .9, letterSpacing: '-0.06em', margin: '28px 0 24px', maxWidth: 760 }}>
              Деньги в Дом
            </h1>
            <p style={{ maxWidth: 680, fontSize: 22, lineHeight: 1.55, color: '#dbe1e5', margin: 0 }}>
              Серьёзная бонусная система RichHouse: клиент ежедневно открывает коробку, получает баллы и билеты, оставляет заявку на подбор мебели и возвращается к бренду снова.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 34 }}>
              <a href={botUrl} style={{ background: 'linear-gradient(135deg, #d7b56f, #a97c38)', color: '#111820', padding: '17px 26px', borderRadius: 14, fontWeight: 800, textDecoration: 'none', boxShadow: '0 18px 40px rgba(200,161,90,.22)' }}>Открыть Telegram-бот</a>
              <a href="/game" style={{ border: '1px solid rgba(220,226,232,.25)', color: '#f6f0e6', padding: '17px 26px', borderRadius: 14, fontWeight: 700, textDecoration: 'none', background: 'rgba(255,255,255,.035)' }}>Посмотреть механику</a>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -24, background: 'linear-gradient(135deg, rgba(200,161,90,.24), rgba(119,139,153,.12))', filter: 'blur(34px)', borderRadius: 42 }} />
            <div style={{ position: 'relative', border: '1px solid rgba(220,226,232,.16)', borderRadius: 34, padding: 28, background: 'linear-gradient(145deg, rgba(255,255,255,.09), rgba(255,255,255,.025))', boxShadow: '0 30px 90px rgba(0,0,0,.36)' }}>
              <div style={{ border: '1px solid rgba(200,161,90,.35)', borderRadius: 26, padding: 26, background: 'rgba(13,18,24,.55)' }}>
                <div style={{ color: '#c8a15a', textTransform: 'uppercase', letterSpacing: 3, fontSize: 12 }}>Daily Box</div>
                <div style={{ marginTop: 22, aspectRatio: '1/1', borderRadius: 28, background: 'linear-gradient(145deg, #2a3138, #111820)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ width: 180, height: 180, borderRadius: 28, background: 'linear-gradient(135deg, #d8b76f, #8d642b)', color: '#111820', display: 'grid', placeItems: 'center', fontSize: 38, fontWeight: 900, letterSpacing: 3, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)' }}>R/H</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
                  <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.055)', padding: 16 }}><b>+ баллы</b><br /><span style={{ color: '#aeb8c2' }}>на покупку</span></div>
                  <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.055)', padding: 16 }}><b>+ билеты</b><br /><span style={{ color: '#aeb8c2' }}>на розыгрыш</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 74 }}>
          {advantages.map((item) => (
            <div key={item.title} style={{ border: '1px solid rgba(220,226,232,.13)', borderRadius: 26, padding: 24, background: 'rgba(255,255,255,.045)' }}>
              <div style={{ color: '#c8a15a', fontSize: 13, letterSpacing: 2 }}>{item.value}</div>
              <h3 style={{ fontSize: 22, margin: '18px 0 10px' }}>{item.title}</h3>
              <p style={{ color: '#b8c1c9', lineHeight: 1.55, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, border: '1px solid rgba(200,161,90,.2)', borderRadius: 28, padding: 28, background: 'rgba(13,18,24,.42)' }}>
          <h2 style={{ margin: 0, fontSize: 32 }}>Как это работает для продаж</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
            {mechanics.map((item) => (
              <div key={item} style={{ color: '#dbe1e5', lineHeight: 1.5, borderLeft: '2px solid #c8a15a', paddingLeft: 14 }}>{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
