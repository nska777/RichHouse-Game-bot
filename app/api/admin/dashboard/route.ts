import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const date = today();
  const [{ count: usersCount }, { count: leadsCount }, { count: todayBoxesCount }, users, leads, draw] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('daily_boxes').select('*', { count: 'exact', head: true }).eq('opened_date', date),
    supabaseAdmin.from('users').select('id,name,phone,telegram_username,points,tickets,created_at').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('draws').select('*, users:winner_user_id(name,phone,telegram_username,tickets)').eq('draw_date', date).eq('draw_type', 'daily').maybeSingle(),
  ]);

  const drawUser = draw.data?.users as any;

  return NextResponse.json({
    usersCount: usersCount || 0,
    leadsCount: leadsCount || 0,
    todayBoxesCount: todayBoxesCount || 0,
    users: users.data || [],
    leads: leads.data || [],
    drawResult: draw.data ? {
      name: drawUser?.name || drawUser?.telegram_username || null,
      phone: drawUser?.phone || null,
      telegram: drawUser?.telegram_username || null,
      tickets: drawUser?.tickets || 0,
      prize: draw.data.prize_title,
    } : null,
  });
}
