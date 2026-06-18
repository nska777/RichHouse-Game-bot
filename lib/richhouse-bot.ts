type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = { id: number; type: string };
type TelegramPhotoSize = { file_id: string; width: number; height: number };
type TelegramContact = { phone_number: string; first_name?: string; last_name?: string; user_id?: number };

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  photo?: TelegramPhotoSize[];
  caption?: string;
  contact?: TelegramContact;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type LeadDraft = {
  type: string;
  source?: string;
  room?: string;
  style?: string;
  budget?: string;
  salon?: string;
  visitTime?: string;
  designerStudio?: string;
  phone?: string;
  comment?: string;
  hasPhoto?: boolean;
  photoFileId?: string;
  step?: string;
  updatedAt: number;
};

type InlineButton = { text: string; callback_data?: string; url?: string };

type ReplyMarkup = {
  inline_keyboard?: InlineButton[][];
  keyboard?: Array<Array<{ text: string; request_contact?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
};

const drafts = new Map<number, LeadDraft>();

const roomLabels: Record<string, string> = {
  bedroom: 'Спальня',
  living: 'Гостиная',
  dining: 'Обеденная зона',
  office: 'Кабинет',
  kids: 'Детская',
  other: 'Другое',
};

const styleLabels: Record<string, string> = {
  neoclassic: 'Неоклассика',
  modern: 'Современный стиль',
  light: 'Светлый интерьер',
  dark: 'Тёмный интерьер',
  italian: 'Итальянский стиль',
  help: 'Не знаю, нужна помощь',
};

const budgetLabels: Record<string, string> = {
  b50: 'До 50 млн сум',
  b100: '50–100 млн сум',
  b200: '100–200 млн сум',
  b200plus: '200+ млн сум',
  unknown: 'Пока не знаю',
};

const salonLabels: Record<string, string> = {
  main: 'Главный салон RichHouse',
  any: 'Любой удобный салон',
  online: 'Сначала онлайн-консультация',
};

const visitLabels: Record<string, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'В выходные',
  manager: 'Согласовать с менеджером',
};

function telegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function managerChatId() {
  return process.env.TELEGRAM_MANAGER_CHAT_ID || '';
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
}

function botUrl() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '';
}

function cleanHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function userTitle(user?: TelegramUser) {
  if (!user) return 'Пользователь Telegram';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const username = user.username ? `@${user.username}` : '';
  return [name, username].filter(Boolean).join(' / ') || `ID ${user.id}`;
}

function sourceFromText(text?: string) {
  if (!text?.startsWith('/start')) return undefined;
  const parts = text.trim().split(/\s+/);
  return parts[1] || 'direct';
}

async function telegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = telegramToken();
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return null;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Telegram API error ${method}:`, text);
    return null;
  }

  return (await response.json()) as T;
}

async function sendMessage(chatId: number | string, text: string, replyMarkup?: ReplyMarkup) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallbackQuery(callbackQueryId: string) {
  return telegramApi('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

async function forwardPhotoToManagers(message: TelegramMessage, caption: string) {
  const chatId = managerChatId();
  const photo = message.photo?.at(-1);
  if (!chatId || !photo) return;

  await telegramApi('sendPhoto', {
    chat_id: chatId,
    photo: photo.file_id,
    caption,
    parse_mode: 'HTML',
  });
}

function mainMenu(): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: '🛋 Подобрать мебель', callback_data: 'flow:selection' }],
      [{ text: '📚 Получить каталог', callback_data: 'flow:catalog' }, { text: '🧮 Рассчитать комплект', callback_data: 'flow:calculate' }],
      [{ text: '🏛 Записаться в салон', callback_data: 'flow:visit' }],
      [{ text: '🎨 Я дизайнер', callback_data: 'flow:designer' }, { text: '♻️ Обновить интерьер', callback_data: 'flow:tradein' }],
      [{ text: '👤 Связаться с менеджером', callback_data: 'flow:manager' }],
    ],
  };
}

function roomMenu(prefix: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Спальня', callback_data: `${prefix}:room:bedroom` }, { text: 'Гостиная', callback_data: `${prefix}:room:living` }],
      [{ text: 'Обеденная зона', callback_data: `${prefix}:room:dining` }, { text: 'Кабинет', callback_data: `${prefix}:room:office` }],
      [{ text: 'Детская', callback_data: `${prefix}:room:kids` }, { text: 'Другое', callback_data: `${prefix}:room:other` }],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  };
}

function styleMenu(prefix: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Неоклассика', callback_data: `${prefix}:style:neoclassic` }, { text: 'Современный', callback_data: `${prefix}:style:modern` }],
      [{ text: 'Светлый интерьер', callback_data: `${prefix}:style:light` }, { text: 'Тёмный интерьер', callback_data: `${prefix}:style:dark` }],
      [{ text: 'Итальянский стиль', callback_data: `${prefix}:style:italian` }],
      [{ text: 'Не знаю, помогите выбрать', callback_data: `${prefix}:style:help` }],
    ],
  };
}

function budgetMenu(prefix: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'До 50 млн', callback_data: `${prefix}:budget:b50` }, { text: '50–100 млн', callback_data: `${prefix}:budget:b100` }],
      [{ text: '100–200 млн', callback_data: `${prefix}:budget:b200` }, { text: '200+ млн', callback_data: `${prefix}:budget:b200plus` }],
      [{ text: 'Пока не знаю', callback_data: `${prefix}:budget:unknown` }],
    ],
  };
}

function contactKeyboard(): ReplyMarkup {
  return {
    keyboard: [[{ text: '📲 Отправить номер телефона', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function catalogMenu(): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Спальни', callback_data: 'catalog:bedroom' }, { text: 'Гостиные', callback_data: 'catalog:living' }],
      [{ text: 'Обеденные зоны', callback_data: 'catalog:dining' }, { text: 'Кабинеты', callback_data: 'catalog:office' }],
      [{ text: 'Распродажа', callback_data: 'catalog:sale' }, { text: 'Премиальные коллекции', callback_data: 'catalog:premium' }],
      [{ text: 'Получить персональный подбор', callback_data: 'flow:selection' }],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  };
}

function resetOldDrafts() {
  const now = Date.now();
  for (const [chatId, draft] of drafts.entries()) {
    if (now - draft.updatedAt > 1000 * 60 * 60 * 12) drafts.delete(chatId);
  }
}

function getDraft(chatId: number, defaults: Partial<LeadDraft> = {}) {
  resetOldDrafts();
  const current = drafts.get(chatId);
  if (current) return current;

  const draft: LeadDraft = {
    type: defaults.type || 'Заявка',
    source: defaults.source,
    step: defaults.step,
    updatedAt: Date.now(),
  };
  drafts.set(chatId, draft);
  return draft;
}

function withoutUndefined(patch: Partial<LeadDraft>) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<LeadDraft>;
}

function patchDraft(chatId: number, patch: Partial<LeadDraft>) {
  const current = getDraft(chatId);
  const next = { ...current, ...withoutUndefined(patch), updatedAt: Date.now() };
  drafts.set(chatId, next);
  return next;
}

function leadText(draft: LeadDraft, user?: TelegramUser) {
  const rows = [
    '<b>Новая заявка RichHouse</b>',
    '',
    `<b>Тип:</b> ${cleanHtml(draft.type)}`,
    draft.room ? `<b>Комната:</b> ${cleanHtml(draft.room)}` : '',
    draft.style ? `<b>Стиль:</b> ${cleanHtml(draft.style)}` : '',
    draft.budget ? `<b>Бюджет:</b> ${cleanHtml(draft.budget)}` : '',
    draft.salon ? `<b>Салон:</b> ${cleanHtml(draft.salon)}` : '',
    draft.visitTime ? `<b>Время визита:</b> ${cleanHtml(draft.visitTime)}` : '',
    draft.designerStudio ? `<b>Студия/компания:</b> ${cleanHtml(draft.designerStudio)}` : '',
    draft.phone ? `<b>Телефон:</b> ${cleanHtml(draft.phone)}` : '',
    draft.hasPhoto ? '<b>Фото комнаты:</b> есть' : '',
    draft.comment ? `<b>Комментарий:</b> ${cleanHtml(draft.comment)}` : '',
    draft.source ? `<b>Источник:</b> ${cleanHtml(draft.source)}` : '',
    `<b>Telegram:</b> ${cleanHtml(userTitle(user))}`,
    user?.id ? `<b>Telegram ID:</b> ${user.id}` : '',
  ];

  return rows.filter(Boolean).join('\n');
}

async function submitLead(chatId: number, user?: TelegramUser) {
  const draft = getDraft(chatId);
  const target = managerChatId();

  if (!target) {
    await sendMessage(chatId, 'Заявка собрана, но <b>TELEGRAM_MANAGER_CHAT_ID</b> ещё не настроен. Добавьте ID рабочей группы в Vercel.', { remove_keyboard: true });
    return;
  }

  await sendMessage(target, leadText(draft, user));
  await sendMessage(chatId, 'Спасибо! Заявка принята. Менеджер RichHouse свяжется с вами и подготовит подходящие варианты мебели.', { remove_keyboard: true });
  drafts.delete(chatId);
}

async function startSelection(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Подбор мебели по интерьеру', source, step: 'room' });
  await sendMessage(chatId, 'Отлично. Что хотите подобрать?\n\nПосле ответов можно будет отправить фото комнаты, а менеджер подготовит 2–3 подходящих варианта.', roomMenu('selection'));
}

async function startCalculation(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Расчёт комплекта мебели', source, step: 'room' });
  await sendMessage(chatId, 'Какой комплект нужно рассчитать?', roomMenu('calculate'));
}

async function startDesigner(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Партнёрская заявка дизайнера', source, step: 'designer_studio' });
  await sendMessage(chatId, 'RichHouse Design Club — условия для дизайнеров, архитекторов и интерьерных студий.\n\nНапишите название вашей студии/компании или просто ваше имя.');
}

async function startVisit(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Запись на персональный подбор в салоне', source, step: 'salon' });
  await sendMessage(chatId, 'Куда вам удобнее записаться?', {
    inline_keyboard: [
      [{ text: 'Главный салон RichHouse', callback_data: 'visit:salon:main' }],
      [{ text: 'Любой удобный салон', callback_data: 'visit:salon:any' }],
      [{ text: 'Сначала онлайн-консультация', callback_data: 'visit:salon:online' }],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  });
}

async function startTradeIn(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Обновление интерьера / партнёрская оценка старой мебели', source, step: 'room' });
  await sendMessage(chatId, 'RichHouse производит мебель только из новых материалов. Но мы можем помочь с обновлением интерьера: подобрать новую мебель и передать контакт партнёрам, которые занимаются оценкой/вывозом старой мебели.\n\nЧто хотите обновить?', roomMenu('tradein'));
}

async function startManager(chatId: number, source?: string) {
  patchDraft(chatId, { type: 'Связаться с менеджером', source, step: 'phone' });
  await sendMessage(chatId, 'Оставьте номер телефона, и менеджер RichHouse свяжется с вами.', contactKeyboard());
}

async function handleCatalog(chatId: number, section?: string) {
  if (!section) {
    await sendMessage(chatId, 'Выберите раздел каталога:', catalogMenu());
    return;
  }

  const titleBySection: Record<string, string> = {
    bedroom: 'Спальни',
    living: 'Гостиные',
    dining: 'Обеденные зоны',
    office: 'Кабинеты',
    sale: 'Распродажа',
    premium: 'Премиальные коллекции',
  };

  const title = titleBySection[section] || 'Каталог';
  const site = appUrl() ? `\n\nСайт: ${appUrl()}` : '';
  await sendMessage(chatId, `<b>${cleanHtml(title)}</b>\n\nСейчас каталог в боте работает как быстрый вход в заявку. Нажмите кнопку ниже — менеджер отправит актуальные фото, цены и наличие по вашему запросу.${site}`, {
    inline_keyboard: [
      [{ text: 'Получить подборку по этому разделу', callback_data: `cataloglead:${section}` }],
      [{ text: 'Другой раздел', callback_data: 'flow:catalog' }, { text: 'Главное меню', callback_data: 'menu:main' }],
    ],
  });
}

async function handleCallback(callback: TelegramCallbackQuery) {
  const data = callback.data || '';
  const chatId = callback.message?.chat.id;
  if (!chatId) return;

  await answerCallbackQuery(callback.id);

  if (data === 'menu:main') return sendMessage(chatId, 'Главное меню RichHouse:', mainMenu());
  if (data === 'flow:selection') return startSelection(chatId);
  if (data === 'flow:calculate') return startCalculation(chatId);
  if (data === 'flow:catalog') return handleCatalog(chatId);
  if (data === 'flow:visit') return startVisit(chatId);
  if (data === 'flow:designer') return startDesigner(chatId);
  if (data === 'flow:tradein') return startTradeIn(chatId);
  if (data === 'flow:manager') return startManager(chatId);
  if (data.startsWith('catalog:')) return handleCatalog(chatId, data.split(':')[1]);

  if (data.startsWith('cataloglead:')) {
    const section = data.split(':')[1] || 'catalog';
    const title = {
      bedroom: 'Спальни',
      living: 'Гостиные',
      dining: 'Обеденные зоны',
      office: 'Кабинеты',
      sale: 'Распродажа',
      premium: 'Премиальные коллекции',
    }[section] || section;
    patchDraft(chatId, { type: `Запрос каталога: ${title}`, room: title, step: 'phone' });
    await sendMessage(chatId, 'Оставьте номер телефона, и менеджер отправит актуальные варианты, цены и наличие.', contactKeyboard());
    return;
  }

  const [prefix, field, value] = data.split(':');

  if (field === 'room') {
    patchDraft(chatId, { room: roomLabels[value] || value, step: 'style' });
    await sendMessage(chatId, 'Какой стиль вам ближе?', styleMenu(prefix));
    return;
  }

  if (field === 'style') {
    patchDraft(chatId, { style: styleLabels[value] || value, step: 'budget' });
    await sendMessage(chatId, 'Какой примерный бюджет рассматриваете?', budgetMenu(prefix));
    return;
  }

  if (field === 'budget') {
    patchDraft(chatId, { budget: budgetLabels[value] || value, step: 'photo_or_phone' });
    await sendMessage(chatId, 'Теперь можно отправить фото комнаты, размеры или сразу оставить номер телефона.\n\nФото поможет подобрать мебель точнее.', contactKeyboard());
    return;
  }

  if (prefix === 'visit' && field === 'salon') {
    patchDraft(chatId, { salon: salonLabels[value] || value, step: 'visit_time' });
    await sendMessage(chatId, 'Когда вам удобно?', {
      inline_keyboard: [
        [{ text: 'Сегодня', callback_data: 'visit:time:today' }, { text: 'Завтра', callback_data: 'visit:time:tomorrow' }],
        [{ text: 'В выходные', callback_data: 'visit:time:weekend' }],
        [{ text: 'Согласовать с менеджером', callback_data: 'visit:time:manager' }],
      ],
    });
    return;
  }

  if (prefix === 'visit' && field === 'time') {
    patchDraft(chatId, { visitTime: visitLabels[value] || value, step: 'phone' });
    await sendMessage(chatId, 'Оставьте номер телефона для подтверждения записи.', contactKeyboard());
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const source = sourceFromText(text);

  if (text?.startsWith('/start')) {
    drafts.delete(chatId);
    if (source && source !== 'direct') patchDraft(chatId, { source });
    await sendMessage(chatId, 'Добро пожаловать в RichHouse.\n\nЯ помогу подобрать мебель под ваш интерьер, рассчитать комплект, записать вас в салон или передать заявку менеджеру.', mainMenu());
    return;
  }

  if (text === '/menu') {
    await sendMessage(chatId, 'Главное меню RichHouse:', mainMenu());
    return;
  }

  if (message.contact?.phone_number) {
    patchDraft(chatId, { phone: message.contact.phone_number, step: 'done' });
    await submitLead(chatId, message.from);
    return;
  }

  if (message.photo?.length) {
    const photo = message.photo.at(-1);
    const caption = message.caption?.trim();
    const draft = patchDraft(chatId, {
      hasPhoto: true,
      photoFileId: photo?.file_id,
      comment: caption || getDraft(chatId).comment,
      step: 'phone',
    });

    await forwardPhotoToManagers(message, `<b>Фото к заявке RichHouse</b>\n${leadText(draft, message.from)}`);
    await sendMessage(chatId, 'Фото получил. Теперь оставьте номер телефона, чтобы менеджер подготовил подборку и связался с вами.', contactKeyboard());
    return;
  }

  const draft = getDraft(chatId);

  if (draft.step === 'designer_studio') {
    patchDraft(chatId, { designerStudio: text || 'Не указано', step: 'phone' });
    await sendMessage(chatId, 'Оставьте номер телефона для связи и отправки условий сотрудничества.', contactKeyboard());
    return;
  }

  if (text) {
    patchDraft(chatId, { comment: text, step: draft.step || 'phone' });
    await sendMessage(chatId, 'Принял. Чтобы менеджер мог связаться с вами, отправьте номер телефона.', contactKeyboard());
    return;
  }

  await sendMessage(chatId, 'Выберите действие в меню:', mainMenu());
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }

  if (update.message) await handleMessage(update.message);
}

export async function setTelegramWebhook(secret: string) {
  const baseUrl = appUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set');

  const webhookUrl = `https://${baseUrl}/api/telegram/webhook?secret=${encodeURIComponent(secret)}`;
  return telegramApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
  });
}

export function publicBotUrl() {
  return botUrl();
}
