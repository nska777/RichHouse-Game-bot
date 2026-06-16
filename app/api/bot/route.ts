import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { mainKeyboard, sendTelegramMessage } from '../../../lib/telegram';

async function findOrCreateUser(message: any) {
  const from = message.from;
  const chatId = message.chat.id;

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', from.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      telegram_id: from.id,
      telegram_username: from.username || null,
      name: [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Участник',
      phone: null,
      points: 1000,
      tickets: 1,
    })
    .select('*')
    .single();

  if (error) throw error;

  await sendTelegramMessage(
    chatId,
    'Добро пожаловать в RichHouse Деньги в Дом! Вам начислено 1000 баллов и 1 билет. Нажмите «Открыть коробку дня».',
    mainKeyboard()
  );

  return user;
}

export async function POST(request: Request) {
  const update = await request.json();
  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text;
  const user = await findOrCreateUser(message);

  if (text === '/start') {
    await sendTelegramMessage(chatId, 'Вы в игре RichHouse Деньги в Дом. Открывайте коробку каждый день, копите баллы и билеты.', mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('баланс')) {
    await sendTelegramMessage(chatId, `Ваш баланс:\nБаллы: ${user.points}\nБилеты: ${user.tickets}`, mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('коробку')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const response = await fetch(appUrl + '/api/game/open-box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: user.telegram_id }),
    });
    const result = await response.json();

    if (result.alreadyOpened) {
      await sendTelegramMessage(chatId, 'Вы уже открывали коробку сегодня. Возвращайтесь завтра.', mainKeyboard());
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, `Коробка открыта!\nБаллы: +${result.reward.points}\nБилеты: +${result.reward.tickets}\n${result.reward.gift ? 'Подарок: ' + result.reward.gift : ''}`, mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('подборку')) {
    await supabaseAdmin.from('leads').insert({ user_id: user.id, name: user.name, phone: user.phone, interest: 'Подбор мебели из игры', status: 'new' });
    const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
    if (managerChatId) {
      await sendTelegramMessage(managerChatId, `Новая заявка из игры RichHouse\nИмя: ${user.name}\nTelegram: @${user.telegram_username || '-'}\nБаллы: ${user.points}\nБилеты: ${user.tickets}`);
    }
    await sendTelegramMessage(chatId, 'Заявка принята. Менеджер RichHouse свяжется с вами для подбора мебели.', mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Правила')) {
    await sendTelegramMessage(chatId, 'Участие бесплатное. Каждый день можно открыть одну коробку. Баллы можно использовать при покупке мебели по правилам акции. Билеты участвуют в розыгрышах RichHouse.', mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, 'Выберите действие в меню.', mainKeyboard());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'RichHouse Telegram webhook' });
}
