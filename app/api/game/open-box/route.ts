import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRandomReward } from '@/lib/rewards';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const body = await request.json();
  const telegramId = Number(body.telegramId);

  if (!telegramId) {
    return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 });
  }

  const date = today();
  const { data: existing } = await supabaseAdmin
    .from('daily_boxes')
    .select('*')
    .eq('user_id', user.id)
    .eq('opened_date', date)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ alreadyOpened: true, reward: existing });
  }

  const reward = getRandomReward();

  const { data: box, error: boxError } = await supabaseAdmin
    .from('daily_boxes')
    .insert({
      user_id: user.id,
      opened_date: date,
      reward_type: reward.type,
      points: reward.points,
      tickets: reward.tickets,
      gift: reward.gift,
    })
    .select('*')
    .single();

  if (boxError) {
    return NextResponse.json({ error: boxError.message }, { status: 500 });
  }

  await supabaseAdmin
    .from('users')
    .update({ points: user.points + reward.points, tickets: user.tickets + reward.tickets, last_box_opened_at: new Date().toISOString() })
    .eq('id', user.id);

  await supabaseAdmin.from('actions').insert({
    user_id: user.id,
    action_type: 'open_daily_box',
    points_added: reward.points,
    tickets_added: reward.tickets,
    metadata: { rewardTitle: reward.title },
  });

  return NextResponse.json({ alreadyOpened: false, reward: box });
}
