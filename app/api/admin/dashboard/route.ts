import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [{ count: usersCount }, { count: leadsCount }, { count: todayBoxesCount }, users, leads] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('daily_boxes').select('*', { count: 'exact', head: true }).eq('opened_date', today()),
    supabaseAdmin.from('users').select('id,name,phone,telegram_username,points,tickets,created_at').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  return NextResponse.json({
    usersCount: usersCount || 0,
    leadsCount: leadsCount || 0,
    todayBoxesCount: todayBoxesCount || 0,
    users: users.data || [],
    leads: leads.data || [],
  });
}
