import { requiredEnv } from './env';

const PRODUCTION_APP_URL = 'https://rich-house-game-bot.vercel.app';

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  const token = requiredEnv('TELEGRAM_BOT_TOKEN');
  const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export function getAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_APP_URL;
  if (raw.includes('localhost') || raw.includes('127.0.0.1')) return PRODUCTION_APP_URL;
  return raw.replace(/\/$/, '');
}

export function mainKeyboard() {
  return {
    keyboard: [
      [{ text: '🕹️ Играть внутри' }, { text: '🎡 Колесо бонусов' }],
      [{ text: '🎮 Игра дня' }, { text: '🏠 Собрать интерьер' }],
      [{ text: '🎁 Открыть коробку дня' }, { text: '💎 Использовать баллы' }],
      [{ text: '📊 Мой баланс' }, { text: '👥 Пригласить друга' }],
      [{ text: '📜 Правила' }],
    ],
    resize_keyboard: true,
  };
}

export function miniAppInlineKeyboard(telegramId?: string | number) {
  const tgParam = telegramId ? `?tg=${telegramId}` : '';
  const url = `${getAppUrl()}/play${tgParam}`;

  return {
    inline_keyboard: [
      [{ text: '🕹️ Открыть игру внутри Telegram', web_app: { url } }],
      [{ text: 'Открыть обычной ссылкой', url }],
    ],
  };
}

export function phoneKeyboard() {
  return {
    keyboard: [[{ text: 'Отправить номер телефона', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function optionKeyboard(options: string[], back = true) {
  const rows = [];
  for (let i = 0; i < options.length; i += 2) {
    rows.push(options.slice(i, i + 2).map((text) => ({ text })));
  }
  if (back) rows.push([{ text: 'Отмена' }]);
  return { keyboard: rows, resize_keyboard: true };
}
