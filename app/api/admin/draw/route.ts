import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pickWeightedWinner(rows: Array<{ user_id: string; users: any }>) {
  const pool: Array<{ id: string; user: any }> = [];
  for (const row of rows) {
    const tickets = Math.max(Number(row.users?.tickets || 1), 1);
    for (let i = 0; i < tickets; i += 1) {
      pool.push({ id: row.user_id, user: row.users });
    }
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const date = today();
  const { data: existingDraw } = await supabaseAdmin
    .from('draws')
    .select('*, users:winner_user_id(name,phone,telegram_username,tickets)')
    .eq('draw_date', date)
    .eq('draw_type', 'daily')
    .maybeSingle();

  if (existingDraw) {
    return NextResponse.redirect(new URL(`/admin?secret=${secret}`, request.url));
  }

  const { data: boxes, error } = await supabaseAdmin
    .from('daily_boxes')
    .select('user_id, users:user_id(id,name,phone,telegram_username,tickets)')
    .eq('opened_date', date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const winner = pickWeightedWinner((boxes || []) as any);
  if (!winner) {
    return NextResponse.redirect(new URL(`/admin?secret=${secret}`, request.url));
  }

  await supabaseAdmin.from('draws').insert({
    draw_type: 'daily',
    prize_title: 'Ежедневный приз RichHouse',
    prize_amount: 300000,
    winner_user_id: winner.id,
    draw_date: date,
  });

  return NextResponse.redirect(new URL(`/admin?secret=${secret}`, request.url));
}
