import { saveLead } from '@/lib/lead-storage';

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  photo?: Array<{ file_id: string }>;
  caption?: string;
  contact?: { phone_number: string };
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

type Markup = {
  inline_keyboard?: Array<Array<{ text: string; callback_data?: string }>>;
  keyboard?: Array<Array<{ text: string; request_contact?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
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

const drafts = new Map<number, LeadDraft>();

const rooms: Record<string, string> = {
  bedroom: 'Спальня',
  living: 'Гостиная',
  dining: 'Обеденная зона',
  office: 'Кабинет',
  kids: 'Детская',
  other: 'Другое',
};

const styles: Record<string, string> = {
  neoclassic: 'Неоклассика',
  modern: 'Современный стиль',
  light: 'Светлый интерьер',
  dark: 'Тёмный интерьер',
  italian: 'Итальянский стиль',
  help: 'Не знаю, нужна помощь',
};

const budgets: Record<string, string> = {
  b50: 'До 50 млн сум',
  b100: '50–100 млн сум',
  b200: '100–200 млн сум',
  b200plus: '200+ млн сум',
  unknown: 'Пока не знаю',
};

const salons: Record<string, string> = {
  main: 'Главный салон RichHouse',
  any: 'Любой удобный салон',
  online: 'Сначала онлайн-консультация',
};

const times: Record<string, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'В выходные',
  manager: 'Согласовать с менеджером',
};

const catalog: Record<string, string> = {
  bedroom: 'Спальни',
  living: 'Гостиные',
  dining: 'Обеденные зоны',
  office: 'Кабинеты',
  sale: 'Распродажа',
  premium: 'Премиальные коллекции',
};

function html(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function managerChatId() {
  return process.env.TELEGRAM_MANAGER_CHAT_ID || '';
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
}

function sourceFromText(text?: string) {
  return text?.startsWith('/start')
    ? text.trim().split(/\s+/)[1] || 'direct'
    : undefined;
}

function cleanPatch<T extends object>(patch: T) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<LeadDraft>;
}

function userName(user?: TelegramUser) {
  return [
    user?.first_name,
    user?.last_name,
    user?.username ? `@${user.username}` : '',
  ]
    .filter(Boolean)
    .join(' / ') || 'Telegram user';
}

async function tg(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) console.error('Telegram error', method, await res.text());

  return res.ok ? res.json() : null;
}

async function msg(chatId: number | string, text: string, reply_markup?: Markup) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(reply_markup ? { reply_markup } : {}),
  });
}

function getDraft(chatId: number) {
  const now = Date.now();

  for (const [key, item] of drafts.entries()) {
    if (now - item.updatedAt > 43_200_000) drafts.delete(key);
  }

  const draft = drafts.get(chatId) || { type: 'Заявка', updatedAt: now };
  drafts.set(chatId, draft);

  return draft;
}

function patchDraft(chatId: number, patch: Partial<LeadDraft>) {
  const next = {
    ...getDraft(chatId),
    ...cleanPatch(patch),
    updatedAt: Date.now(),
  } as LeadDraft;

  drafts.set(chatId, next);

  return next;
}

function mainMenu(): Markup {
  return {
    inline_keyboard: [
      [{ text: '🛋 Подобрать мебель', callback_data: 'flow:selection' }],
      [
        { text: '📚 Получить каталог', callback_data: 'flow:catalog' },
        { text: '🧮 Рассчитать комплект', callback_data: 'flow:calculate' },
      ],
      [{ text: '📷 Отправить фото комнаты', callback_data: 'flow:room_photo' }],
      [{ text: '🏛 Записаться в салон', callback_data: 'flow:visit' }],
      [
        { text: '🎨 Я дизайнер', callback_data: 'flow:designer' },
        { text: '♻️ Обновить интерьер', callback_data: 'flow:tradein' },
      ],
      [{ text: '👤 Связаться с менеджером', callback_data: 'flow:manager' }],
    ],
  };
}

function roomMenu(prefix: string): Markup {
  return {
    inline_keyboard: [
      [
        { text: 'Спальня', callback_data: `${prefix}:room:bedroom` },
        { text: 'Гостиная', callback_data: `${prefix}:room:living` },
      ],
      [
        { text: 'Обеденная зона', callback_data: `${prefix}:room:dining` },
        { text: 'Кабинет', callback_data: `${prefix}:room:office` },
      ],
      [
        { text: 'Детская', callback_data: `${prefix}:room:kids` },
        { text: 'Другое', callback_data: `${prefix}:room:other` },
      ],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  };
}

function styleMenu(prefix: string): Markup {
  return {
    inline_keyboard: [
      [
        { text: 'Неоклассика', callback_data: `${prefix}:style:neoclassic` },
        { text: 'Современный', callback_data: `${prefix}:style:modern` },
      ],
      [
        { text: 'Светлый интерьер', callback_data: `${prefix}:style:light` },
        { text: 'Тёмный интерьер', callback_data: `${prefix}:style:dark` },
      ],
      [{ text: 'Итальянский стиль', callback_data: `${prefix}:style:italian` }],
      [{ text: 'Не знаю, помогите выбрать', callback_data: `${prefix}:style:help` }],
    ],
  };
}

function budgetMenu(prefix: string): Markup {
  return {
    inline_keyboard: [
      [
        { text: 'До 50 млн', callback_data: `${prefix}:budget:b50` },
        { text: '50–100 млн', callback_data: `${prefix}:budget:b100` },
      ],
      [
        { text: '100–200 млн', callback_data: `${prefix}:budget:b200` },
        { text: '200+ млн', callback_data: `${prefix}:budget:b200plus` },
      ],
      [{ text: 'Пока не знаю', callback_data: `${prefix}:budget:unknown` }],
    ],
  };
}

function contactKeyboard(): Markup {
  return {
    keyboard: [[{ text: '📲 Отправить номер телефона', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function catalogMenu(): Markup {
  return {
    inline_keyboard: [
      [
        { text: 'Спальни', callback_data: 'catalog:bedroom' },
        { text: 'Гостиные', callback_data: 'catalog:living' },
      ],
      [
        { text: 'Обеденные зоны', callback_data: 'catalog:dining' },
        { text: 'Кабинеты', callback_data: 'catalog:office' },
      ],
      [
        { text: 'Распродажа', callback_data: 'catalog:sale' },
        { text: 'Премиальные коллекции', callback_data: 'catalog:premium' },
      ],
      [{ text: 'Получить персональный подбор', callback_data: 'flow:selection' }],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  };
}

function leadText(draft: LeadDraft, user?: TelegramUser) {
  return [
    '<b>Новая заявка RichHouse</b>',
    '',
    `<b>Тип:</b> ${html(draft.type)}`,
    draft.room ? `<b>Комната:</b> ${html(draft.room)}` : '',
    draft.style ? `<b>Стиль:</b> ${html(draft.style)}` : '',
    draft.budget ? `<b>Бюджет:</b> ${html(draft.budget)}` : '',
    draft.salon ? `<b>Салон:</b> ${html(draft.salon)}` : '',
    draft.visitTime ? `<b>Время визита:</b> ${html(draft.visitTime)}` : '',
    draft.designerStudio
      ? `<b>Студия/компания:</b> ${html(draft.designerStudio)}`
      : '',
    draft.phone ? `<b>Телефон:</b> ${html(draft.phone)}` : '',
    draft.hasPhoto ? '<b>Фото комнаты:</b> есть' : '',
    draft.comment ? `<b>Комментарий:</b> ${html(draft.comment)}` : '',
    draft.source ? `<b>Источник:</b> ${html(draft.source)}` : '',
    `<b>Telegram:</b> ${html(userName(user))}`,
    user?.id ? `<b>Telegram ID:</b> ${user.id}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function submitLead(chatId: number, user?: TelegramUser) {
  const draft = getDraft(chatId);

  await saveLead({
    lead_type: draft.type,
    source: draft.source || null,
    room: draft.room || null,
    style: draft.style || null,
    budget: draft.budget || null,
    salon: draft.salon || null,
    visit_time: draft.visitTime || null,
    designer_studio: draft.designerStudio || null,
    phone: draft.phone || null,
    comment: draft.comment || null,
    has_photo: Boolean(draft.hasPhoto),
    photo_file_id: draft.photoFileId || null,
    telegram_user_id: user?.id || null,
    telegram_username: user?.username || null,
    telegram_first_name: user?.first_name || null,
    telegram_last_name: user?.last_name || null,
  });

  if (managerChatId()) await msg(managerChatId(), leadText(draft, user));

  await msg(
    chatId,
    'Спасибо! Заявка принята. Менеджер RichHouse свяжется с вами и подготовит подходящие варианты мебели.',
    { remove_keyboard: true },
  );

  drafts.delete(chatId);
}

async function startSelection(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Подбор мебели по интерьеру',
    source,
    step: 'room',
  });

  await msg(
    chatId,
    'Отлично. Что хотите подобрать?\n\nПосле ответов можно отправить фото комнаты, а менеджер подготовит 2–3 варианта.',
    roomMenu('selection'),
  );
}

async function startCalculation(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Расчёт комплекта мебели',
    source,
    step: 'room',
  });

  await msg(chatId, 'Какой комплект нужно рассчитать?', roomMenu('calculate'));
}

async function startRoomPhoto(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Фото комнаты для подбора мебели',
    source,
    step: 'wait_room_photo',
  });

  await msg(
    chatId,
    '📷 Отправьте фото комнаты.\n\nМожно прикрепить фото из галереи или сделать снимок прямо через Telegram на телефоне.\n\nПосле отправки фото менеджер RichHouse получит его в рабочую группу и подготовит варианты мебели.',
    {
      inline_keyboard: [[{ text: '← В главное меню', callback_data: 'menu:main' }]],
    },
  );
}

async function startDesigner(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Партнёрская заявка дизайнера',
    source,
    step: 'designer_studio',
  });

  await msg(
    chatId,
    'RichHouse Design Club — условия для дизайнеров, архитекторов и интерьерных студий.\n\nНапишите название вашей студии/компании или просто ваше имя.',
  );
}

async function startTradeIn(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Обновление интерьера / партнёрская оценка старой мебели',
    source,
    step: 'room',
  });

  await msg(
    chatId,
    'RichHouse производит мебель только из новых материалов. Но мы можем помочь с обновлением интерьера: подобрать новую мебель и передать контакт партнёрам, которые занимаются оценкой/вывозом старой мебели.\n\nЧто хотите обновить?',
    roomMenu('tradein'),
  );
}

async function startManager(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Связаться с менеджером',
    source,
    step: 'phone',
  });

  await msg(
    chatId,
    'Оставьте номер телефона, и менеджер RichHouse свяжется с вами.',
    contactKeyboard(),
  );
}

async function startVisit(chatId: number, source?: string) {
  patchDraft(chatId, {
    type: 'Запись на персональный подбор в салоне',
    source,
    step: 'salon',
  });

  await msg(chatId, 'Куда вам удобнее записаться?', {
    inline_keyboard: [
      [{ text: 'Главный салон RichHouse', callback_data: 'visit:salon:main' }],
      [{ text: 'Любой удобный салон', callback_data: 'visit:salon:any' }],
      [{ text: 'Сначала онлайн-консультация', callback_data: 'visit:salon:online' }],
      [{ text: '← В главное меню', callback_data: 'menu:main' }],
    ],
  });
}

async function handleCatalog(chatId: number, section?: string) {
  if (!section) return msg(chatId, 'Выберите раздел каталога:', catalogMenu());

  const title = catalog[section] || 'Каталог';
  const site = appUrl() ? `\n\nСайт: ${appUrl()}` : '';

  await msg(
    chatId,
    `<b>${html(title)}</b>\n\nНажмите кнопку ниже — менеджер отправит актуальные фото, цены и наличие по вашему запросу.${site}`,
    {
      inline_keyboard: [
        [{ text: 'Получить подборку', callback_data: `cataloglead:${section}` }],
        [
          { text: 'Другой раздел', callback_data: 'flow:catalog' },
          { text: 'Главное меню', callback_data: 'menu:main' },
        ],
      ],
    },
  );
}

async function handleCallback(callback: TelegramCallbackQuery) {
  const data = callback.data || '';
  const chatId = callback.message?.chat.id;

  if (!chatId) return;

  await tg('answerCallbackQuery', { callback_query_id: callback.id });

  if (data === 'menu:main') return msg(chatId, 'Главное меню RichHouse:', mainMenu());

  if (data === 'flow:selection') return startSelection(chatId);
  if (data === 'flow:calculate') return startCalculation(chatId);
  if (data === 'flow:room_photo') return startRoomPhoto(chatId);
  if (data === 'flow:catalog') return handleCatalog(chatId);
  if (data === 'flow:visit') return startVisit(chatId);
  if (data === 'flow:designer') return startDesigner(chatId);
  if (data === 'flow:tradein') return startTradeIn(chatId);
  if (data === 'flow:manager') return startManager(chatId);

  if (data.startsWith('catalog:')) {
    return handleCatalog(chatId, data.split(':')[1]);
  }

  if (data.startsWith('cataloglead:')) {
    const key = data.split(':')[1] || 'catalog';
    const title = catalog[key] || key;

    patchDraft(chatId, {
      type: `Запрос каталога: ${title}`,
      room: title,
      step: 'phone',
    });

    return msg(
      chatId,
      'Оставьте номер телефона, и менеджер отправит актуальные варианты, цены и наличие.',
      contactKeyboard(),
    );
  }

  const [prefix, field, value] = data.split(':');

  if (field === 'room') {
    patchDraft(chatId, {
      room: rooms[value] || value,
      step: 'style',
    });

    return msg(chatId, 'Какой стиль вам ближе?', styleMenu(prefix));
  }

  if (field === 'style') {
    patchDraft(chatId, {
      style: styles[value] || value,
      step: 'budget',
    });

    return msg(chatId, 'Какой примерный бюджет рассматриваете?', budgetMenu(prefix));
  }

  if (field === 'budget') {
    patchDraft(chatId, {
      budget: budgets[value] || value,
      step: 'photo_or_phone',
    });

    return msg(
      chatId,
      'Теперь можно отправить фото комнаты, размеры или сразу оставить номер телефона.\n\nФото поможет подобрать мебель точнее.',
      contactKeyboard(),
    );
  }

  if (prefix === 'visit' && field === 'salon') {
    patchDraft(chatId, {
      salon: salons[value] || value,
      step: 'visit_time',
    });

    return msg(chatId, 'Когда вам удобно?', {
      inline_keyboard: [
        [
          { text: 'Сегодня', callback_data: 'visit:time:today' },
          { text: 'Завтра', callback_data: 'visit:time:tomorrow' },
        ],
        [{ text: 'В выходные', callback_data: 'visit:time:weekend' }],
        [{ text: 'Согласовать с менеджером', callback_data: 'visit:time:manager' }],
      ],
    });
  }

  if (prefix === 'visit' && field === 'time') {
    patchDraft(chatId, {
      visitTime: times[value] || value,
      step: 'phone',
    });

    return msg(chatId, 'Оставьте номер телефона для подтверждения записи.', contactKeyboard());
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const source = sourceFromText(text);

  if (text?.startsWith('/start')) {
    drafts.delete(chatId);

    if (source && source !== 'direct') {
      patchDraft(chatId, { source });
    }

    return msg(
      chatId,
      'Добро пожаловать в RichHouse.\n\nЯ помогу подобрать мебель под ваш интерьер, рассчитать комплект, записать вас в салон или передать заявку менеджеру.',
      mainMenu(),
    );
  }

  if (text === '/menu') {
    return msg(chatId, 'Главное меню RichHouse:', mainMenu());
  }
  if (text === '/chatid') {
  return msg(chatId, `ID этого чата: <code>${chatId}</code>`);
  }

  if (message.contact?.phone_number) {
    patchDraft(chatId, {
      phone: message.contact.phone_number,
      step: 'done',
    });

    return submitLead(chatId, message.from);
  }

  if (message.photo?.length) {
    const photo = message.photo.at(-1);

    const draft = patchDraft(chatId, {
      type: getDraft(chatId).type || 'Фото комнаты для подбора мебели',
      hasPhoto: true,
      photoFileId: photo?.file_id,
      comment: message.caption?.trim() || getDraft(chatId).comment,
      step: 'phone',
    });

    if (photo && managerChatId()) {
      await tg('sendPhoto', {
        chat_id: managerChatId(),
        photo: photo.file_id,
        caption:
          `<b>📷 Новое фото комнаты RichHouse</b>\n\n` +
          leadText(draft, message.from),
        parse_mode: 'HTML',
      });
    }

    return msg(
      chatId,
      'Фото получил ✅\n\nЯ отправил его менеджеру RichHouse. Теперь оставьте номер телефона, чтобы менеджер смог связаться с вами и подготовить подборку мебели.',
      contactKeyboard(),
    );
  }

  const draft = getDraft(chatId);

  if (draft.step === 'designer_studio') {
    patchDraft(chatId, {
      designerStudio: text || 'Не указано',
      step: 'phone',
    });

    return msg(
      chatId,
      'Оставьте номер телефона для связи и отправки условий сотрудничества.',
      contactKeyboard(),
    );
  }

  if (text) {
    patchDraft(chatId, {
      comment: text,
      step: draft.step || 'phone',
    });

    return msg(
      chatId,
      'Принял. Чтобы менеджер мог связаться с вами, отправьте номер телефона.',
      contactKeyboard(),
    );
  }

  return msg(chatId, 'Выберите действие в меню:', mainMenu());
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message) return handleMessage(update.message);
}

export async function setTelegramWebhook(secret: string) {
  const baseUrl = appUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (!baseUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set');

  return tg('setWebhook', {
    url: `https://${baseUrl}/api/telegram/webhook?secret=${encodeURIComponent(secret)}`,
    allowed_updates: ['message', 'callback_query'],
  });
}

export function publicBotUrl() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || '';
}