import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { mainKeyboard, miniAppInlineKeyboard, optionKeyboard, phoneKeyboard, sendTelegramMessage } from '../../../lib/telegram';

const roomOptions = ['Спальня', 'Гостиная', 'Столовая', 'Детская', 'Прихожая', 'Весь дом'];
const styleOptions = ['Неоклассика', 'Современный', 'Итальянский', 'Минимализм', 'Светлый интерьер', 'Тёмный интерьер'];
const budgetOptions = ['до 30 млн', '30–70 млн', '70–150 млн', '150 млн+', 'Пока не знаю'];
const timelineOptions = ['В течение недели', 'В этом месяце', '1–3 месяца', 'Позже', 'Просто смотрю'];
const gameOptions = ['Неоклассика', 'Лофт', 'Хай-тек', 'Кантри'];

const wheelRewards = [
  { title: '+5 000 баллов', points: 5000, tickets: 0 },
  { title: '+10 000 баллов', points: 10000, tickets: 0 },
  { title: '+1 билет', points: 1000, tickets: 1 },
  { title: '+3 билета', points: 1500, tickets: 3 },
  { title: 'Бонус на доставку', points: 7000, tickets: 1 },
  { title: 'VIP-подборка мебели', points: 12000, tickets: 2 },
];

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseDraft(comment?: string | null) {
  if (!comment) return { step: 'room' } as any;
  try {
    return JSON.parse(comment);
  } catch {
    return { step: 'room' } as any;
  }
}

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
    'Добро пожаловать в RichHouse Client Club. Вам начислено 1000 баллов и 1 билет. Чтобы закрепить бонусы и участвовать в розыгрышах, отправьте номер телефона.',
    phoneKeyboard()
  );

  return user;
}

async function getDraftLead(userId: string) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'profile_draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function getGameDraft(userId: string) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'game_draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function startInteriorQuiz(user: any, chatId: number) {
  await supabaseAdmin.from('leads').delete().eq('user_id', user.id).eq('status', 'profile_draft');

  await supabaseAdmin.from('leads').insert({
    user_id: user.id,
    name: user.name,
    phone: user.phone,
    interest: 'Интерьерный квиз RichHouse',
    status: 'profile_draft',
    comment: JSON.stringify({ step: 'room' }),
  });

  await sendTelegramMessage(chatId, 'Начинаем подбор интерьера. Шаг 1/4\n\nКакая комната вам нужна?', optionKeyboard(roomOptions));
}

async function finishInteriorQuiz(user: any, draft: any, profile: any, chatId: number) {
  const finalComment = JSON.stringify({ completed: true, style: profile.style, timeline: profile.timeline, source: 'interior_quiz' });

  await supabaseAdmin
    .from('leads')
    .update({ status: 'new', interest: `Интерьерный подбор: ${draft.room_type || 'комната'}`, budget: draft.budget, comment: finalComment })
    .eq('id', draft.id);

  await supabaseAdmin
    .from('users')
    .update({ points: Number(user.points || 0) + 15000, tickets: Number(user.tickets || 0) + 3 })
    .eq('id', user.id);

  await supabaseAdmin.from('actions').insert({
    user_id: user.id,
    action_type: 'complete_interior_quiz',
    points_added: 15000,
    tickets_added: 3,
    metadata: { room: draft.room_type, style: profile.style, budget: draft.budget, timeline: profile.timeline },
  });

  const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
  if (managerChatId && managerChatId !== '0') {
    await sendTelegramMessage(
      managerChatId,
      `Новая заявка RichHouse Interior Quiz\nИмя: ${user.name}\nТелефон: ${user.phone || '-'}\nTelegram: @${user.telegram_username || '-'}\nКомната: ${draft.room_type || '-'}\nСтиль: ${profile.style || '-'}\nБюджет: ${draft.budget || '-'}\nСрок покупки: ${profile.timeline || '-'}\nБонус за квиз: +15000 баллов, +3 билета`
    );
  }

  await sendTelegramMessage(
    chatId,
    `Интерьерный профиль готов.\n\nКомната: ${draft.room_type}\nСтиль: ${profile.style}\nБюджет: ${draft.budget}\nСрок: ${profile.timeline}\n\nRichHouse начислил вам +15000 баллов и +3 билета. Менеджер сможет подготовить подборку под ваш интерьер.`,
    mainKeyboard()
  );
}

async function continueInteriorQuiz(user: any, text: string, chatId: number) {
  const draft = await getDraftLead(user.id);
  if (!draft) return false;

  if (text === 'Отмена') {
    await supabaseAdmin.from('leads').delete().eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Интерьерный подбор отменён. Вы можете начать заново в любой момент.', mainKeyboard());
    return true;
  }

  const profile = parseDraft(draft.comment);

  if (profile.step === 'room') {
    await supabaseAdmin.from('leads').update({ room_type: text, comment: JSON.stringify({ step: 'style' }) }).eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Шаг 2/4\n\nКакой стиль вам ближе?', optionKeyboard(styleOptions));
    return true;
  }

  if (profile.step === 'style') {
    await supabaseAdmin.from('leads').update({ comment: JSON.stringify({ step: 'budget', style: text }) }).eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Шаг 3/4\n\nКакой ориентировочный бюджет?', optionKeyboard(budgetOptions));
    return true;
  }

  if (profile.step === 'budget') {
    await supabaseAdmin.from('leads').update({ budget: text, comment: JSON.stringify({ ...profile, step: 'timeline' }) }).eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Шаг 4/4\n\nКогда планируете покупку?', optionKeyboard(timelineOptions));
    return true;
  }

  if (profile.step === 'timeline') {
    await finishInteriorQuiz(user, draft, { ...profile, timeline: text }, chatId);
    return true;
  }

  return false;
}

async function startMiniGame(user: any, chatId: number) {
  const { data: alreadyPlayed } = await supabaseAdmin
    .from('actions')
    .select('id')
    .eq('user_id', user.id)
    .eq('action_type', 'daily_mini_game')
    .gte('created_at', todayStart())
    .limit(1)
    .maybeSingle();

  if (alreadyPlayed) {
    await sendTelegramMessage(chatId, 'Вы уже прошли игру дня. Завтра будет новое задание и новые бонусы.', mainKeyboard());
    return;
  }

  await supabaseAdmin.from('leads').delete().eq('user_id', user.id).eq('status', 'game_draft');
  await supabaseAdmin.from('leads').insert({
    user_id: user.id,
    name: user.name,
    phone: user.phone,
    interest: 'Игра дня RichHouse',
    status: 'game_draft',
    comment: JSON.stringify({ answer: 'Неоклассика' }),
  });

  await sendTelegramMessage(
    chatId,
    '🎮 Игра дня: угадайте стиль интерьера.\n\nВысокое мягкое изголовье, молдинги на стенах, светлая палитра, спокойная статусность. Какой это стиль?',
    optionKeyboard(gameOptions)
  );
}

async function continueMiniGame(user: any, text: string, chatId: number) {
  const draft = await getGameDraft(user.id);
  if (!draft) return false;

  if (text === 'Отмена') {
    await supabaseAdmin.from('leads').delete().eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Игра дня отменена. Можно вернуться позже.', mainKeyboard());
    return true;
  }

  const data = parseDraft(draft.comment);
  const correct = text === data.answer;
  const points = correct ? 5000 : 500;
  const tickets = correct ? 2 : 0;

  await supabaseAdmin.from('leads').delete().eq('id', draft.id);
  await supabaseAdmin.from('users').update({ points: Number(user.points || 0) + points, tickets: Number(user.tickets || 0) + tickets }).eq('id', user.id);
  await supabaseAdmin.from('actions').insert({
    user_id: user.id,
    action_type: 'daily_mini_game',
    points_added: points,
    tickets_added: tickets,
    metadata: { answer: text, correct },
  });

  await sendTelegramMessage(
    chatId,
    correct
      ? `Верно! Это неоклассика.\n\nВаш бонус: +${points} баллов и +${tickets} билета.`
      : `Ответ не совсем верный. Правильный ответ: Неоклассика.\n\nЗа участие RichHouse начислил вам +${points} баллов.`,
    mainKeyboard()
  );
  return true;
}

async function spinBonusWheel(user: any, chatId: number) {
  const { data: alreadySpun } = await supabaseAdmin
    .from('actions')
    .select('id')
    .eq('user_id', user.id)
    .eq('action_type', 'bonus_wheel')
    .gte('created_at', todayStart())
    .limit(1)
    .maybeSingle();

  if (alreadySpun) {
    await sendTelegramMessage(chatId, 'Колесо бонусов уже использовано сегодня. Возвращайтесь завтра за новым вращением.', mainKeyboard());
    return;
  }

  const reward = wheelRewards[Math.floor(Math.random() * wheelRewards.length)];

  await supabaseAdmin.from('users').update({ points: Number(user.points || 0) + reward.points, tickets: Number(user.tickets || 0) + reward.tickets }).eq('id', user.id);
  await supabaseAdmin.from('actions').insert({
    user_id: user.id,
    action_type: 'bonus_wheel',
    points_added: reward.points,
    tickets_added: reward.tickets,
    metadata: { title: reward.title },
  });

  await sendTelegramMessage(
    chatId,
    `🎡 Колесо бонусов остановилось на секторе:\n\n${reward.title}\n\nНачислено: +${reward.points} баллов${reward.tickets ? ` и +${reward.tickets} билета` : ''}.`,
    mainKeyboard()
  );
}

async function sendMiniAppLaunch(user: any, chatId: number) {
  await sendTelegramMessage(
    chatId,
    'Нажмите кнопку ниже — игра откроется отдельным окном прямо внутри Telegram. Если Telegram Desktop не откроет окно, используйте запасную кнопку обычной ссылки.',
    miniAppInlineKeyboard(user.telegram_id)
  );
}

async function requestUsePoints(user: any, chatId: number) {
  const { data: freshUser } = await supabaseAdmin.from('users').select('points,tickets').eq('id', user.id).maybeSingle();
  const points = freshUser?.points ?? user.points;
  const tickets = freshUser?.tickets ?? user.tickets;

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .insert({
      user_id: user.id,
      name: user.name,
      phone: user.phone,
      interest: 'Клиент хочет использовать баллы при покупке мебели',
      status: 'new',
      comment: JSON.stringify({ source: 'use_points', points, tickets }),
    })
    .select('*')
    .single();

  const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
  if (managerChatId && managerChatId !== '0') {
    await sendTelegramMessage(
      managerChatId,
      `Клиент хочет использовать баллы RichHouse\nИмя: ${user.name}\nТелефон: ${user.phone || '-'}\nTelegram: @${user.telegram_username || '-'}\nБаллы: ${points}\nБилеты: ${tickets}\nЗаявка: ${lead?.id || '-'}`
    );
  }

  await sendTelegramMessage(
    chatId,
    `У вас ${points} баллов.\n\nМы передали менеджеру, что вы хотите использовать баллы при покупке мебели. Менеджер подскажет, какой бонус можно применить к вашему заказу.`,
    mainKeyboard()
  );
}

async function createLeadIfNeeded(user: any) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id,status,created_at')
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { created: false, lead: existing };

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({ user_id: user.id, name: user.name, phone: user.phone, interest: 'Подбор мебели из игры', status: 'new' })
    .select('*')
    .single();

  if (error) throw error;
  return { created: true, lead };
}

export async function POST(request: Request) {
  const update = await request.json();
  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });
  if (message.chat?.type !== 'private') return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const user = await findOrCreateUser(message);

  if (message.contact?.phone_number) {
    await supabaseAdmin.from('users').update({ phone: message.contact.phone_number }).eq('id', user.id);
    await sendTelegramMessage(chatId, 'Номер сохранён. Теперь можно играть, крутить колесо бонусов, собирать интерьер и использовать баллы при покупке мебели.', mainKeyboard());
    await sendMiniAppLaunch(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (!message.text) return NextResponse.json({ ok: true });
  const text = message.text;

  if (text === '/start') {
    if (!user.phone) {
      await sendTelegramMessage(chatId, 'Вы в RichHouse Client Club. Для участия отправьте номер телефона.', phoneKeyboard());
      return NextResponse.json({ ok: true });
    }
    await sendTelegramMessage(chatId, 'Вы в RichHouse Client Club. Здесь можно играть, получать баллы, билеты и использовать их при покупке мебели.', mainKeyboard());
    await sendMiniAppLaunch(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (!user.phone) {
    await sendTelegramMessage(chatId, 'Сначала отправьте номер телефона, чтобы мы могли закрепить за вами баллы, билеты и призы.', phoneKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (await continueMiniGame(user, text, chatId)) return NextResponse.json({ ok: true });
  if (await continueInteriorQuiz(user, text, chatId)) return NextResponse.json({ ok: true });

  if (text.includes('Играть внутри')) {
    await sendMiniAppLaunch(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Колесо')) {
    await spinBonusWheel(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Игра дня')) {
    await startMiniGame(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Использовать баллы')) {
    await requestUsePoints(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Собрать интерьер')) {
    await startInteriorQuiz(user, chatId);
    return NextResponse.json({ ok: true });
  }

  if (text.includes('баланс')) {
    const { data: freshUser } = await supabaseAdmin.from('users').select('points,tickets').eq('id', user.id).maybeSingle();
    await sendTelegramMessage(chatId, `Ваш баланс:\nБаллы: ${freshUser?.points ?? user.points}\nБилеты: ${freshUser?.tickets ?? user.tickets}\n\nБаллы можно использовать через кнопку «Использовать баллы».`, mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('коробку')) {
    const appUrl = new URL(request.url).origin;
    const response = await fetch(appUrl + '/api/game/open-box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: user.telegram_id }),
    });
    const result = await response.json();

    if (!response.ok) {
      await sendTelegramMessage(chatId, 'Не удалось открыть коробку. Попробуйте ещё раз чуть позже.', mainKeyboard());
      return NextResponse.json({ ok: true });
    }

    if (result.alreadyOpened) {
      await sendTelegramMessage(chatId, 'Вы уже открывали коробку сегодня. Возвращайтесь завтра.', mainKeyboard());
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, `Коробка открыта!\nБаллы: +${result.reward.points}\nБилеты: +${result.reward.tickets}\n${result.reward.gift ? 'Подарок: ' + result.reward.gift : ''}`, mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('подборку')) {
    const leadResult = await createLeadIfNeeded(user);
    if (!leadResult.created) {
      await sendTelegramMessage(chatId, 'У вас уже есть активная заявка. Менеджер RichHouse свяжется с вами. Повторную заявку можно оставить позже.', mainKeyboard());
      return NextResponse.json({ ok: true });
    }
    const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
    if (managerChatId && managerChatId !== '0') {
      await sendTelegramMessage(managerChatId, `Новая заявка из игры RichHouse\nИмя: ${user.name}\nТелефон: ${user.phone || '-'}\nTelegram: @${user.telegram_username || '-'}\nБаллы: ${user.points}\nБилеты: ${user.tickets}`);
    }
    await sendTelegramMessage(chatId, 'Заявка принята. Менеджер RichHouse свяжется с вами для подбора мебели.', mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Пригласить')) {
    const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/your_bot';
    await sendTelegramMessage(chatId, `Ваша ссылка для приглашения:\n${botUrl}?start=${user.id}\nЗа регистрацию друга можно начислять дополнительные баллы на следующих этапах.`, mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (text.includes('Правила')) {
    await sendTelegramMessage(chatId, 'Участие бесплатное. Каждый день можно открыть коробку, пройти игру дня и крутить колесо бонусов. Баллы можно использовать при покупке мебели по условиям акции.', mainKeyboard());
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, 'Выберите действие в меню.', mainKeyboard());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'RichHouse Telegram webhook' });
}
