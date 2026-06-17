'use client';

import { useMemo, useState } from 'react';

type GameKey = 'match' | 'quiz' | 'catch';

type ClaimResult = {
  ok?: boolean;
  alreadyClaimed?: boolean;
  points?: number;
  tickets?: number;
  score?: number;
  title?: string;
  error?: string;
};

const cardsBase = [
  { id: 'bed', label: 'Кровать', pair: 'Спальня' },
  { id: 'sofa', label: 'Диван', pair: 'Гостиная' },
  { id: 'table', label: 'Стол', pair: 'Столовая' },
  { id: 'wardrobe', label: 'Шкаф', pair: 'Спальня' },
];

const quiz = [
  { q: 'Для премиальной спальни клиент чаще выбирает...', a: 'Кровать + шкаф + тумбы', options: ['Один стул', 'Кровать + шкаф + тумбы', 'Только зеркало'] },
  { q: 'Что лучше продаёт дорогую мебель?', a: 'Готовый интерьерный комплект', options: ['Случайная скидка', 'Готовый интерьерный комплект', 'Одна картинка без описания'] },
  { q: 'Какая заявка ценнее менеджеру?', a: 'Комната + стиль + бюджет', options: ['Только имя', 'Только лайк', 'Комната + стиль + бюджет'] },
];

function getTelegramId() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('tg') || '';
}

function cardStyle(active?: boolean) {
  return {
    border: active ? '1px solid #d7b56f' : '1px solid rgba(220,226,232,.15)',
    borderRadius: 22,
    padding: 18,
    minHeight: 92,
    background: active ? 'rgba(215,181,111,.16)' : 'rgba(255,255,255,.055)',
    color: '#f6f0e6',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center' as const,
  };
}

export default function PlayPage() {
  const telegramId = getTelegramId();
  const [game, setGame] = useState<GameKey>('match');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function claim(gameKey: GameKey, score: number) {
    if (!telegramId) {
      setResult({ error: 'Откройте мини-игру из Telegram-бота, чтобы начислить бонусы на ваш профиль.' });
      return;
    }
    setLoading(true);
    const response = await fetch('/api/game/claim-webgame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId, gameKey, score }),
    });
    const data = await response.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ minHeight: '100vh', padding: '28px 16px 70px' }}>
      <section style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c8a15a', textDecoration: 'none' }}>← RichHouse</a>
        <div style={{ marginTop: 24, border: '1px solid rgba(220,226,232,.14)', borderRadius: 34, padding: 28, background: 'linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.025))' }}>
          <p style={{ color: '#c8a15a', letterSpacing: 4, textTransform: 'uppercase', margin: 0 }}>RichHouse Interactive</p>
          <h1 style={{ fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: .95, margin: '18px 0' }}>Мини-игры для бонусов</h1>
          <p style={{ color: '#dbe1e5', fontSize: 19, lineHeight: 1.55, maxWidth: 720 }}>
            Играйте, набирайте очки и получайте реальные баллы RichHouse. Один бонус за каждую мини-игру доступен один раз в день.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
          <button onClick={() => { setGame('match'); setResult(null); }} style={cardStyle(game === 'match')}>Найди пару</button>
          <button onClick={() => { setGame('quiz'); setResult(null); }} style={cardStyle(game === 'quiz')}>Дизайн-тест</button>
          <button onClick={() => { setGame('catch'); setResult(null); }} style={cardStyle(game === 'catch')}>Поймай бонус</button>
        </div>

        <div style={{ marginTop: 18 }}>
          {game === 'match' ? <MatchGame onFinish={(score) => claim('match', score)} loading={loading} /> : null}
          {game === 'quiz' ? <QuizGame onFinish={(score) => claim('quiz', score)} loading={loading} /> : null}
          {game === 'catch' ? <CatchGame onFinish={(score) => claim('catch', score)} loading={loading} /> : null}
        </div>

        {result ? (
          <div style={{ marginTop: 18, border: '1px solid rgba(200,161,90,.35)', borderRadius: 24, padding: 22, background: 'rgba(200,161,90,.09)' }}>
            {result.alreadyClaimed ? (
              <b>Сегодня бонус за эту игру уже начислен. Завтра можно сыграть снова.</b>
            ) : result.error ? (
              <b>{result.error}</b>
            ) : (
              <b>Бонус начислен: +{result.points} баллов и +{result.tickets} билетов. Результат: {result.score}/100.</b>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MatchGame({ onFinish, loading }: { onFinish: (score: number) => void; loading: boolean }) {
  const cards = useMemo(() => {
    const left = cardsBase.map((item) => ({ type: 'item', key: item.id, text: item.label, pair: item.pair }));
    const right = cardsBase.map((item) => ({ type: 'room', key: item.pair + item.id, text: item.pair, pair: item.pair }));
    return [...left, ...right].sort(() => Math.random() - 0.5);
  }, []);
  const [selected, setSelected] = useState<any[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  function pick(card: any) {
    if (matched.includes(card.key) || selected.length >= 2) return;
    const next = [...selected, card];
    setSelected(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      setTimeout(() => {
        if (next[0].pair === next[1].pair && next[0].type !== next[1].type) {
          setMatched((m) => [...m, next[0].key, next[1].key]);
        }
        setSelected([]);
      }, 450);
    }
  }

  const done = matched.length === cards.length;
  const score = Math.max(40, 100 - moves * 8);

  return (
    <div style={{ border: '1px solid rgba(220,226,232,.12)', borderRadius: 28, padding: 24, background: 'rgba(13,18,24,.42)' }}>
      <h2>Найди пару: мебель и комната</h2>
      <p style={{ color: '#b8c1c9' }}>Соедини предмет мебели с комнатой. Чем меньше попыток, тем больше бонус.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {cards.map((card) => {
          const active = selected.some((item) => item.key === card.key) || matched.includes(card.key);
          return <button key={card.key} onClick={() => pick(card)} style={cardStyle(active)}>{matched.includes(card.key) ? '✓ ' : ''}{card.text}</button>;
        })}
      </div>
      {done ? <button disabled={loading} onClick={() => onFinish(score)} style={primaryButton()}>{loading ? 'Начисляем...' : `Забрать бонус ${score}/100`}</button> : null}
    </div>
  );
}

function QuizGame({ onFinish, loading }: { onFinish: (score: number) => void; loading: boolean }) {
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const item = quiz[index];
  const done = index >= quiz.length;
  const score = Math.round((right / quiz.length) * 100);

  function answer(value: string) {
    if (value === item.a) setRight((r) => r + 1);
    setIndex((i) => i + 1);
  }

  return (
    <div style={{ border: '1px solid rgba(220,226,232,.12)', borderRadius: 28, padding: 24, background: 'rgba(13,18,24,.42)' }}>
      <h2>Дизайн-тест RichHouse</h2>
      {!done ? (
        <>
          <p style={{ color: '#dbe1e5', fontSize: 20 }}>{item.q}</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {item.options.map((option) => <button key={option} onClick={() => answer(option)} style={cardStyle()}>{option}</button>)}
          </div>
        </>
      ) : (
        <button disabled={loading} onClick={() => onFinish(score)} style={primaryButton()}>{loading ? 'Начисляем...' : `Забрать бонус ${score}/100`}</button>
      )}
    </div>
  );
}

function CatchGame({ onFinish, loading }: { onFinish: (score: number) => void; loading: boolean }) {
  const [hits, setHits] = useState(0);
  const [left, setLeft] = useState(50);
  const [top, setTop] = useState(50);
  const score = Math.min(100, hits * 12);

  function hit() {
    setHits((h) => h + 1);
    setLeft(10 + Math.floor(Math.random() * 75));
    setTop(10 + Math.floor(Math.random() * 70));
  }

  return (
    <div style={{ border: '1px solid rgba(220,226,232,.12)', borderRadius: 28, padding: 24, background: 'rgba(13,18,24,.42)' }}>
      <h2>Поймай бонус RichHouse</h2>
      <p style={{ color: '#b8c1c9' }}>Нажимай на золотой бонус. Набери больше попаданий и забери награду.</p>
      <div style={{ position: 'relative', height: 360, borderRadius: 24, background: 'linear-gradient(145deg, #202832, #111820)', border: '1px solid rgba(200,161,90,.22)', overflow: 'hidden' }}>
        <button onClick={hit} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)', width: 78, height: 78, borderRadius: 999, border: 0, background: 'linear-gradient(135deg, #d7b56f, #a97c38)', color: '#111820', fontWeight: 900, cursor: 'pointer' }}>+R/H</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <b>Попаданий: {hits}</b>
        <button disabled={loading || hits < 3} onClick={() => onFinish(score)} style={primaryButton()}>{loading ? 'Начисляем...' : 'Забрать бонус'}</button>
      </div>
    </div>
  );
}

function primaryButton() {
  return {
    marginTop: 18,
    background: 'linear-gradient(135deg, #d7b56f, #a97c38)',
    color: '#111820',
    border: 0,
    padding: '15px 22px',
    borderRadius: 14,
    fontWeight: 900,
    cursor: 'pointer',
  };
}
