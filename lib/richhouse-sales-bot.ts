import { saveLead } from '@/lib/lead-storage';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type User = { id: number; first_name?: string; last_name?: string; username?: string };
type Message = { chat: { id: number }; from?: User; text?: string; caption?: string; photo?: Array<{ file_id: string }>; contact?: { phone_number: string } };
type Callback = { id: string; data?: string; from: User; message?: Message };
export type TelegramUpdate = { update_id: number; message?: Message; callback_query?: Callback };
type Lang = 'ru' | 'uz';

const SITE = 'https://www.richhouse.uz';
const CATALOG = SITE + '/Магазин';
const CONTACTS = SITE + '/Контакты';
const PHONE = '+998 90 003 80 08';
const MAP = 'https://maps.google.com/?q=41.313576,69.314924';
const draftSources = new Map<number, string>();
const pendingKinds = new Map<number, string>();
const languageCache = new Map<number, Lang>();

const dictionary = {
  ru: {
    choose: '🌐 Выберите язык / Tilni tanlang:',
    welcome: '<b>Добро пожаловать в RichHouse! 🛋</b>\n\nМебель для вашего дома и специальные предложения. Скидки на отдельные товары — до 60%.\n\nВыберите нужный раздел:',
    sale: '🔥 Скидки до 60%', site: '🌐 Наш сайт', manager: '👤 Связаться с менеджером',
    address: '📍 Адрес салона', language: '🌐 Изменить язык',
    saleBody: '<b>🔥 Скидки до 60%</b>\n\nСкидки действуют на отдельные модели. Актуальные цены, наличие и условия акции уточнит менеджер.',
    catalog: '🛍 Смотреть каталог', askSale: '📲 Узнать о скидках',
    back: '⬅️ Главное меню', map: '🗺 Открыть карту', contacts: '🌐 Контакты на сайте',
    addressBody: '<b>📍 RichHouse</b>\nТашкент, проспект Мирзо-Улугбека, 18\nЕжедневно: 09:00–20:00\nТелефон: ',
    phoneRequest: 'Оставьте номер телефона, и менеджер RichHouse свяжется с вами.',
    sendPhone: '📲 Отправить номер телефона',
    thanks: '✅ Спасибо! Ваша заявка отправлена менеджеру RichHouse.',
  },
  uz: {
    choose: '🌐 Tilni tanlang / Выберите язык:',
    welcome: '<b>RichHouse’ga xush kelibsiz! 🛋</b>\n\nUyingiz uchun mebellar va maxsus takliflar. Ayrim mahsulotlarga 60% gacha chegirmalar mavjud.\n\nKerakli bo‘limni tanlang:',
    sale: '🔥 60% gacha chegirmalar', site: '🌐 Bizning saytimiz', manager: '👤 Menejer bilan bog‘lanish',
    address: '📍 Salon manzili', language: '🌐 Tilni o‘zgartirish',
    saleBody: '<b>🔥 60% gacha chegirmalar</b>\n\nChegirmalar ayrim modellarga amal qiladi. Amaldagi narxlar, mavjud mahsulotlar va aksiya shartlarini menejerimizdan bilib olishingiz mumkin.',
    catalog: '🛍 Katalogni ko‘rish', askSale: '📲 Chegirmalar haqida bilish',
    back: '⬅️ Asosiy menyu', map: '🗺 Xaritada ko‘rish', contacts: '🌐 Saytdagi kontaktlar',
    addressBody: '<b>📍 RichHouse</b>\nToshkent, Mirzo Ulug‘bek shohko‘chasi, 18\nHar kuni: 09:00–20:00\nTelefon: ',
    phoneRequest: 'Telefon raqamingizni qoldiring, RichHouse menejeri siz bilan bog‘lanadi.',
    sendPhone: '📲 Telefon raqamni yuborish',
    thanks: '✅ Rahmat! So‘rovingiz RichHouse menejeriga yuborildi.',
  },
};

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
async function getLang(chatId: number): Promise<Lang | undefined> {
  const cached = languageCache.get(chatId);
  if (cached) return cached;
  const db = getSupabaseServerClient();
  if (!db) return undefined;
  const { data, error } = await db.from('telegram_events')
    .select('text').eq('telegram_chat_id', chatId).eq('event_type', 'language_preference')
    .order('created_at', { ascending: false }).limit(1);
  if (error) { console.error('Language lookup:', error.message); return undefined; }
  const value = data?.[0]?.text;
  if (value === 'ru' || value === 'uz') {
    languageCache.set(chatId, value);
    return value;
  }
  return undefined;
}
async function setLang(chatId: number, lang: Lang, updateId: number) {
  languageCache.set(chatId, lang);
  const db = getSupabaseServerClient();
  if (db) {
    const { error } = await db.from('telegram_events').insert({
      update_id: updateId, event_type: 'language_preference', telegram_chat_id: chatId, text: lang,
    });
    if (error) console.error('Language save:', error.message);
  }
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
function languageMenu() {
  return { inline_keyboard: [
    [{ text: '🇷🇺 Русский', callback_data: 'lang:ru' },
     { text: '🇺🇿 O‘zbekcha', callback_data: 'lang:uz' }],
  ] };
}
function menu(lang: Lang) {
  const t = dictionary[lang];
  return { inline_keyboard: [
    [{ text: t.sale, callback_data: 'sale' }],
    [{ text: t.site, url: SITE }],
    [{ text: t.manager, callback_data: 'manager' }],
    [{ text: t.address, callback_data: 'address' }],
    [{ text: t.language, callback_data: 'language' }],
  ] };
}
async function chooseLanguage(chatId: number) {
  return send(chatId, dictionary.ru.choose, languageMenu());
}
async function home(chatId: number, lang: Lang) {
  return send(chatId, dictionary[lang].welcome, menu(lang));
}
async function requestPhone(chatId: number, lang: Lang) {
  const t = dictionary[lang];
  return send(chatId, t.phoneRequest, {
    keyboard: [[{ text: t.sendPhone, request_contact: true }], [{ text: t.back }]],
    resize_keyboard: true, one_time_keyboard: true,
  });
}
async function submitLead(message: Message, lang: Lang) {
  const chatId = message.chat.id;
  const user = message.from;
  const phone = message.contact?.phone_number;
  if (!phone || (user && message.contact && message.from?.id !== undefined && message.chat.id !== user.id)) return;
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
      '<b>Язык:</b> ' + (lang === 'uz' ? 'Узбекский' : 'Русский') + '\n' +
      '<b>Телефон:</b> ' + escapeHtml(phone) + '\n' +
      '<b>Источник:</b> ' + escapeHtml(source) + '\n' +
      '<b>Клиент:</b> ' + escapeHtml(user?.first_name || '') +
      (user?.username ? ' (@' + escapeHtml(user.username) + ')' : '') + '\n' +
      '<b>Telegram ID:</b> ' + (user?.id || '—'));
  }
  pendingKinds.delete(chatId);
  draftSources.delete(chatId);
  await send(chatId, dictionary[lang].thanks, { remove_keyboard: true });
  await home(chatId, lang);
}
export async function handleTelegramUpdate(update: TelegramUpdate) {
  const cb = update.callback_query;
  if (cb) {
    await api('answerCallbackQuery', { callback_query_id: cb.id });
    const chatId = cb.message?.chat.id;
    if (!chatId) return;
    const data = cb.data || '';
    if (data === 'language') return chooseLanguage(chatId);
    if (data === 'lang:ru' || data === 'lang:uz') {
      const lang: Lang = data === 'lang:uz' ? 'uz' : 'ru';
      await setLang(chatId, lang, update.update_id);
      return home(chatId, lang);
    }
    const lang = await getLang(chatId);
    if (!lang) return chooseLanguage(chatId);
    const t = dictionary[lang];
    if (data === 'home') return home(chatId, lang);
    if (data === 'sale') return send(chatId, t.saleBody, {
      inline_keyboard: [
        [{ text: t.catalog, url: CATALOG }],
        [{ text: t.askSale, callback_data: 'phone:sale' }],
        [{ text: t.back, callback_data: 'home' }],
      ],
    });
    if (data === 'address') return send(chatId, t.addressBody + PHONE, {
      inline_keyboard: [
        [{ text: t.map, url: MAP }],
        [{ text: t.contacts, url: CONTACTS }],
        [{ text: t.back, callback_data: 'home' }],
      ],
    });
    if (data === 'manager' || data === 'phone:sale') {
      pendingKinds.set(chatId, data === 'manager' ? 'Связаться с менеджером' : 'Скидки до 60%');
      return requestPhone(chatId, lang);
    }
    return home(chatId, lang);
  }
  const message = update.message;
  if (!message) return;
  const chatId = message.chat.id;
  const input = message.text?.trim() || '';
  if (input.startsWith('/start')) {
    const source = input.split(/\s+/)[1];
    if (source) draftSources.set(chatId, source.slice(0, 64));
    pendingKinds.delete(chatId);
    return chooseLanguage(chatId);
  }
  if (input === '/language' || input === '/lang') return chooseLanguage(chatId);
  if (input === '/chatid') return send(chatId, '<code>' + chatId + '</code>');
  const lang = await getLang(chatId);
  if (!lang) return chooseLanguage(chatId);
  if (input === '/menu' || input === dictionary.ru.back || input === dictionary.uz.back) return home(chatId, lang);
  if (message.contact?.phone_number) return submitLead(message, lang);
  return home(chatId, lang);
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
