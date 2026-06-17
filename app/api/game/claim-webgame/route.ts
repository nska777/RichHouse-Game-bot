import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

const gameRewards: Record<string, { title: string; basePoints: number; baseTickets: number }> = {
  richrush: { title: 'RichHouse Rush', basePoints: 8000, baseTickets: 2 },
  match: { title: 'Найди пару', basePoints: 4000, baseTickets: 1 },
  quiz: { title: 'Дизайн-тест', basePoints: 5000, baseTickets: 2 },
  catch: { title: 'Поймай бонус', basePoints: 3000, baseTickets: 1 },
};

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const telegramId = Number(body?.telegramId || 0);
  const gameKey = String(body?.gameKey || '');
  const score = Math.max(0, Math.min(Number(body?.score || 0), 100));
  const reward = gameRewards[gameKey];

  if (!telegramId || !reward) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id,points,tickets')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message || 'user not found' }, { status: 404 });
  }

  const actionType = `web_game_${gameKey}`;
  const { data: existing } = await supabaseAdmin
    .from('actions')
    .select('id')
    .eq('user_id', user.id)
    .eq('action_type', actionType)
    .gte('created_at', todayStart())
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ alreadyClaimed: true, points: 0, tickets: 0 });
  }

  const points = reward.basePoints + Math.floor(score * 120);
  const tickets = reward.baseTickets + (score >= 80 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0);

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      points: Number(user.points || 0) + points,
      tickets: Number(user.tickets || 0) + tickets,
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('actions').insert({
    user_id: user.id,
    action_type: actionType,
    points_added: points,
    tickets_added: tickets,
    metadata: { title: reward.title, score, source: 'web_game' },
  });

  return NextResponse.json({ ok: true, title: reward.title, score, points, tickets });
}
