import { requiredEnv } from './env';

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

export function mainKeyboard() {
  return {
    keyboard: [
      [{ text: 'Собрать интерьер' }, { text: 'Открыть коробку дня' }],
      [{ text: 'Мой баланс' }, { text: 'Получить подборку' }],
      [{ text: 'Пригласить друга' }, { text: 'Правила' }],
    ],
    resize_keyboard: true,
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
