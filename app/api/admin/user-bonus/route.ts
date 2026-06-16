import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

const bonusPresets: Record<string, { points: number; tickets: number; title: string }> = {
  salon: { points: 20000, tickets: 10, title: 'Бонус за визит в салон' },
  purchase: { points: 50000, tickets: 50, title: 'Бонус за покупку мебели' },
  vip: { points: 100000, tickets: 100, title: 'VIP бонус RichHouse' },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const userId = url.searchParams.get('id');
  const type = url.searchParams.get('type') || '';

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const bonus = bonusPresets[type];
  if (!userId || !bonus) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id,points,tickets')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message || 'user not found' }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      points: Number(user.points || 0) + bonus.points,
      tickets: Number(user.tickets || 0) + bonus.tickets,
    })
    .eq('id', userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('actions').insert({
    user_id: userId,
    action_type: type,
    points_added: bonus.points,
    tickets_added: bonus.tickets,
    metadata: { title: bonus.title, source: 'admin' },
  });

  return NextResponse.redirect(new URL(`/admin?secret=${secret}`, request.url));
}
