'use client';

import { useEffect, useRef, useState } from 'react';

type ClaimResult = {
  ok?: boolean;
  alreadyClaimed?: boolean;
  points?: number;
  tickets?: number;
  score?: number;
  title?: string;
  error?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: { user?: { id?: number } };
      };
    };
  }
}

type Drop = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  kind: 'bonus' | 'furniture' | 'danger';
  label: string;
};

function readTelegramId() {
  if (typeof window === 'undefined') return '';
  const fromQuery = new URLSearchParams(window.location.search).get('tg');
  const fromWebApp = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return fromQuery || (fromWebApp ? String(fromWebApp) : '');
}

const gameButton: React.CSSProperties = {
  border: 0,
  borderRadius: 16,
  padding: '14px 18px',
  fontWeight: 900,
  cursor: 'pointer',
};

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const playerXRef = useRef(0.5);
  const dropsRef = useRef<Drop[]>([]);
  const lastSpawnRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [telegramId, setTelegramId] = useState('');
  const [screen, setScreen] = useState<'intro' | 'playing' | 'finished'>('intro');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
  const [claim, setClaim] = useState<ClaimResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    setTelegramId(readTelegramId());
  }, []);

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key === 'a') keysRef.current.left = true;
      if (event.key === 'ArrowRight' || event.key === 'd') keysRef.current.right = true;
    }
    function up(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key === 'a') keysRef.current.left = false;
      if (event.key === 'ArrowRight' || event.key === 'd') keysRef.current.right = false;
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;

    const startedAt = Date.now();
    lastTimeRef.current = performance.now();
    dropsRef.current = [];
    lastSpawnRef.current = 0;
    playerXRef.current = 0.5;

    function draw(now: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04);
      lastTimeRef.current = now;

      if (keysRef.current.left) playerXRef.current -= dt * 0.95;
      if (keysRef.current.right) playerXRef.current += dt * 0.95;
      playerXRef.current = Math.max(0.08, Math.min(0.92, playerXRef.current));

      if (now - lastSpawnRef.current > 520) {
        lastSpawnRef.current = now;
        const r = Math.random();
        const kind: Drop['kind'] = r < 0.18 ? 'danger' : r < 0.56 ? 'bonus' : 'furniture';
        const label = kind === 'danger' ? '✖' : kind === 'bonus' ? 'R/H' : ['🛏', '🛋', '🪑', '🪞'][Math.floor(Math.random() * 4)];
        dropsRef.current.push({
          id: Date.now() + Math.random(),
          x: 24 + Math.random() * (w - 48),
          y: -40,
          size: kind === 'bonus' ? 42 : 38,
          speed: 145 + Math.random() * 115 + Math.min(score / 80, 120),
          kind,
          label,
        });
      }

      ctx.fillStyle = '#10151b';
      ctx.fillRect(0, 0, w, h);
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgba(215,181,111,.20)');
      gradient.addColorStop(0.45, 'rgba(69,84,99,.18)');
      gradient.addColorStop(1, 'rgba(0,0,0,.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(215,181,111,.09)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 6) * i, 0);
        ctx.lineTo((w / 6) * i - 40, h);
        ctx.stroke();
      }

      const playerW = 82;
      const playerH = 42;
      const playerX = playerXRef.current * w;
      const playerY = h - 76;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY + 35, 50, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d7b56f';
      roundRect(ctx, playerX - playerW / 2, playerY, playerW, playerH, 16);
      ctx.fill();
      ctx.fillStyle = '#111820';
      ctx.font = '900 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('RICH', playerX, playerY + 26);

      const remainingDrops: Drop[] = [];
      for (const drop of dropsRef.current) {
        drop.y += drop.speed * dt;
        const hit = Math.abs(drop.x - playerX) < (playerW / 2 + drop.size / 2) && Math.abs(drop.y - playerY) < 44;
        if (hit) {
          if (drop.kind === 'danger') {
            setLives((value) => Math.max(0, value - 1));
            setCombo(0);
          } else {
            const add = drop.kind === 'bonus' ? 120 : 70;
            setScore((value) => value + add + Math.min(combo * 10, 100));
            setCombo((value) => value + 1);
          }
          continue;
        }
        if (drop.y < h + 60) remainingDrops.push(drop);
      }
      dropsRef.current = remainingDrops;

      for (const drop of dropsRef.current) {
        ctx.save();
        if (drop.kind === 'danger') {
          ctx.fillStyle = '#8d2f2f';
        } else if (drop.kind === 'bonus') {
          ctx.fillStyle = '#d7b56f';
        } else {
          ctx.fillStyle = '#f6f0e6';
        }
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = drop.kind === 'danger' ? '#fff' : '#111820';
        ctx.font = `900 ${drop.kind === 'bonus' ? 13 : 20}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drop.label, drop.x, drop.y + 1);
        ctx.restore();
      }

      const left = Math.max(0, 45 - Math.floor((Date.now() - startedAt) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        setScreen('finished');
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [screen, combo, score]);

  useEffect(() => {
    if (lives <= 0 && screen === 'playing') setScreen('finished');
  }, [lives, screen]);

  function startGame() {
    setScore(0);
    setCombo(0);
    setLives(3);
    setTimeLeft(45);
    setClaim(null);
    setScreen('playing');
  }

  async function claimBonus() {
    if (!telegramId) {
      setClaim({ error: 'Откройте игру через кнопку в Telegram-боте, чтобы начислить бонусы на ваш профиль.' });
      return;
    }
    setLoading(true);
    const finalScore = Math.max(10, Math.min(100, Math.floor(score / 55) + lives * 8));
    const response = await fetch('/api/game/claim-webgame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId, gameKey: 'richrush', score: finalScore }),
    });
    const data = await response.json();
    setClaim(data);
    setLoading(false);
  }

  return (
    <main style={{ minHeight: '100vh', padding: '14px', background: '#10151b' }}>
      <section style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ border: '1px solid rgba(220,226,232,.14)', borderRadius: 26, padding: 18, background: 'linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.025))' }}>
          <p style={{ color: '#c8a15a', letterSpacing: 3, textTransform: 'uppercase', margin: 0, fontSize: 12 }}>RichHouse Arcade</p>
          <h1 style={{ fontSize: 'clamp(34px, 8vw, 64px)', lineHeight: .92, margin: '12px 0' }}>RichHouse Rush</h1>
          <p style={{ color: '#dbe1e5', fontSize: 16, lineHeight: 1.45, margin: 0 }}>
            Лови золотые бонусы и мебель, избегай красных знаков. Управление: пальцем по экрану, кнопками снизу или стрелками на клавиатуре.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
          <Stat label="Очки" value={score} />
          <Stat label="Комбо" value={combo} />
          <Stat label="Жизни" value={'❤'.repeat(lives) || '0'} />
          <Stat label="Время" value={timeLeft} />
        </div>

        <div style={{ position: 'relative', marginTop: 12, borderRadius: 26, overflow: 'hidden', border: '1px solid rgba(200,161,90,.25)' }}>
          <canvas
            ref={canvasRef}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              playerXRef.current = Math.max(0.08, Math.min(0.92, (event.clientX - rect.left) / rect.width));
            }}
            style={{ width: '100%', height: '520px', display: 'block', touchAction: 'none' }}
          />
          {screen !== 'playing' ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(7,11,16,.72)', padding: 24, textAlign: 'center' }}>
              {screen === 'intro' ? (
                <div>
                  <h2 style={{ fontSize: 32, marginBottom: 8 }}>Готов к игре?</h2>
                  <p style={{ color: '#dbe1e5', maxWidth: 420 }}>45 секунд, 3 жизни, реальные баллы за результат. Это уже полноценная мини-игра внутри Telegram.</p>
                  <button onClick={startGame} style={{ ...gameButton, background: '#d7b56f', color: '#111820' }}>Начать игру</button>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: 32, marginBottom: 8 }}>Игра окончена</h2>
                  <p style={{ color: '#dbe1e5' }}>Ваш результат: <b>{score}</b> очков</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={startGame} style={{ ...gameButton, background: 'rgba(255,255,255,.12)', color: '#f6f0e6' }}>Играть ещё</button>
                    <button onClick={claimBonus} disabled={loading} style={{ ...gameButton, background: '#d7b56f', color: '#111820' }}>{loading ? 'Начисляем...' : 'Забрать бонус'}</button>
                  </div>
                  {claim ? <ClaimBox claim={claim} /> : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <button
            onPointerDown={() => (keysRef.current.left = true)}
            onPointerUp={() => (keysRef.current.left = false)}
            onPointerLeave={() => (keysRef.current.left = false)}
            style={{ ...gameButton, background: 'rgba(255,255,255,.1)', color: '#f6f0e6' }}
          >
            ← Влево
          </button>
          <button
            onPointerDown={() => (keysRef.current.right = true)}
            onPointerUp={() => (keysRef.current.right = false)}
            onPointerLeave={() => (keysRef.current.right = false)}
            style={{ ...gameButton, background: 'rgba(255,255,255,.1)', color: '#f6f0e6' }}
          >
            Вправо →
          </button>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid rgba(220,226,232,.12)', borderRadius: 16, padding: 10, background: 'rgba(255,255,255,.045)' }}>
      <div style={{ color: '#c8a15a', fontSize: 11, textTransform: 'uppercase' }}>{label}</div>
      <b>{value}</b>
    </div>
  );
}

function ClaimBox({ claim }: { claim: ClaimResult }) {
  return (
    <div style={{ marginTop: 14, border: '1px solid rgba(200,161,90,.35)', borderRadius: 18, padding: 14, background: 'rgba(200,161,90,.1)' }}>
      {claim.alreadyClaimed ? (
        <b>Сегодня бонус за игру уже начислен. Завтра можно сыграть снова.</b>
      ) : claim.error ? (
        <b>{claim.error}</b>
      ) : (
        <b>Начислено: +{claim.points} баллов и +{claim.tickets} билетов. Результат: {claim.score}/100.</b>
      )}
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
