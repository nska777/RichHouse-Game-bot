import { saveLead } from '@/lib/lead-storage';

type User = { id: number; first_name?: string; last_name?: string; username?: string };
type Message = { chat: { id: number }; from?: User; text?: string; caption?: string; photo?: Array<{ file_id: string }>; contact?: { phone_number: string } };
type Callback = { id: string; data?: string; from: User; message?: Message };
export type TelegramUpdate = { update_id: number; message?: Message; callback_query?: Callback };

const SITE = 'https://www.richhouse.uz';
const CATALOG = SITE + '/Магазин';
const CONTACTS = SITE + '/Контакты';
const PHONE = '+998 90 003 80 08';
const draftSources = new Map<number, string>();

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function menu() {
  return { inline_keyboard: [
    [{ text: '🛋 Каталог мебели', url: CATALOG }],
    [{ text: '🔥 Скидки до 60%', callback_data: 'sale' }],
    [{ text: '🎁 Акции', callback_data: 'promos' }],
    [{ text: '🌐 Наш сайт', url: SITE }],
    [{ text: '👤 Связаться с менеджером', callback_data: 'manager' }],
    [{ text: '📍 Адрес салона', callback_data: 'address' }],
  ] };
}
function back() {
  return { inline_keyboard: [[{ text: '⬅️ Главное меню', callback_data: 'home' }]] };
}
function leadButtons(kind: string) {
  return { inline_keyboard: [
    [{ text: '📲 Оставить номер телефона', callback_data: 'phone:' + kind }],
    [{ text: '⬅️ Главное меню', callback_data: 'home' }],
  ] };
}
async function api(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error('Telegram ' + method + ': ' + JSON.stringify(result));
  return result;
}
async function send(chatId: number | string, text: string, reply_markup?: object) {
  return api('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(reply_markup ? { reply_markup } : {}),
  });
}
async function home(chatId: number) {
  return send(chatId,
    '<b>Добро пожаловать в RichHouse! 🛋</b>\n\n' +
    'Подберите мебель для дома, посмотрите каталог и специальные предложения. ' +
    'Скидки на отдельные товары — до 60%.\n\nВыберите нужный раздел:',
    menu());
}
async function requestPhone(chatId: number, kind: string) {
  return send(chatId,
    'Оставьте номер телефона, и менеджер RichHouse свяжется с вами.',
    { keyboard: [[{ text: '📲 Отправить номер телефона', request_contact: true }],
      [{ text: '⬅️ Главное меню' }]], resize_keyboard: true, one_time_keyboard: true });
}
async function submitLead(message: Message) {
  const chatId = message.chat.id;
  const user = message.from;
  const phone = message.contact?.phone_number;
  if (!phone) return;
  const source = draftSources.get(chatId) || 'direct';
  const kind = pendingKinds.get(chatId) || 'Связаться с менеджером';
  await saveLead({
    lead_type: kind, source, phone, telegram_user_id: user?.id || null,
    telegram_username: user?.username || null,
    telegram_first_name: user?.first_name || null,
    telegram_last_name: user?.last_name || null,
  });
  const managerId = process.env.TELEGRAM_MANAGER_CHAT_ID;
  if (managerId) {
    await send(managerId,
      '<b>🛋 Новая заявка RichHouse</b>\n' +
      '<b>Интерес:</b> ' + escapeHtml(kind) + '\n' +
      '<b>Телефон:</b> ' + escapeHtml(phone) + '\n' +
      '<b>Источник:</b> ' + escapeHtml(source) + '\n' +
      '<b>Клиент:</b> ' + escapeHtml(user?.first_name || '') +
      (user?.username ? ' (@' + escapeHtml(user.username) + ')' : '') + '\n' +
      '<b>Telegram ID:</b> ' + (user?.id || '—'));
  }
  pendingKinds.delete(chatId);
  draftSources.delete(chatId);
  await send(chatId, '✅ Спасибо! Ваша заявка отправлена менеджеру RichHouse.', { remove_keyboard: true });
  await home(chatId);
}
const pendingKinds = new Map<number, string>();

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const callback = update.callback_query;
  if (callback) {
    await api('answerCallbackQuery', { callback_query_id: callback.id });
    const chatId = callback.message?.chat.id;
    if (!chatId) return;
    const data = callback.data || '';
    if (data === 'home') return home(chatId);
    if (data === 'sale') return send(chatId,
      '<b>🔥 Скидки до 60%</b>\n\n' +
      'Скидки действуют на отдельные модели. Актуальные цены, наличие ' +
      'и условия акции уточнит менеджер.',
      { inline_keyboard: [
        [{ text: '🛍 Смотреть каталог', url: CATALOG }],
        [{ text: '📲 Узнать о скидках', callback_data: 'phone:Скидки до 60%' }],
        [{ text: '⬅️ Главное меню', callback_data: 'home' }],
      ] });
    if (data === 'promos') return send(chatId,
      '<b>🎁 Акции RichHouse</b>\n\n' +
      'Узнайте о текущих предложениях и наличии мебели по специальным ценам.',
      { inline_keyboard: [
        [{ text: '🛍 Смотреть каталог', url: CATALOG }],
        [{ text: '📲 Узнать об акциях', callback_data: 'phone:Акции' }],
        [{ text: '⬅️ Главное меню', callback_data: 'home' }],
      ] });
    if (data === 'address') return send(chatId,
      '<b>📍 RichHouse</b>\nТашкент, проспект Мирзо-Улугбека, 18\n' +
      'Ежедневно: 09:00–20:00\nТелефон: ' + PHONE,
      { inline_keyboard: [
        [{ text: '🗺 Открыть карту', url: 'https://maps.google.com/?q=41.313576,69.314924' }],
        [{ text: '🌐 Контакты на сайте', url: CONTACTS }],
        [{ text: '⬅️ Главное меню', callback_data: 'home' }],
      ] });
    if (data === 'manager') {
      pendingKinds.set(chatId, 'Связаться с менеджером');
      return requestPhone(chatId, 'manager');
    }
    if (data.startsWith('phone:')) {
      pendingKinds.set(chatId, data.slice(6));
      return requestPhone(chatId, data.slice(6));
    }
    return home(chatId);
  }
  const message = update.message;
  if (!message) return;
  const chatId = message.chat.id;
  const input = message.text?.trim() || '';
  if (input.startsWith('/start')) {
    const source = input.split(/\s+/)[1];
    if (source) draftSources.set(chatId, source.slice(0, 64));
    pendingKinds.delete(chatId);
    return home(chatId);
  }
  if (input === '/menu' || input === '⬅️ Главное меню') return home(chatId);
  if (input === '/chatid') return send(chatId, '<code>' + chatId + '</code>');
  if (message.contact?.phone_number) return submitLead(message);
  return home(chatId);
}

export async function setTelegramWebhook(secret: string) {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!rawUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set');
  const base = rawUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return api('setWebhook', {
    url: 'https://' + base + '/api/telegram/webhook-sales?secret=' + encodeURIComponent(secret),
    allowed_updates: ['message', 'callback_query'],
  });
}
