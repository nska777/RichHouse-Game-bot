import { supabaseAdmin } from './supabase';
import { mainKeyboard, optionKeyboard, sendTelegramMessage, sendTelegramPhoto } from './telegram';

const budgetOptions = ['до 30 млн', '30–70 млн', '70–150 млн', '150 млн+', 'Пока не знаю'];
const styleOptions = ['Неоклассика', 'Современный', 'Итальянский', 'Минимализм', 'Светлый интерьер', 'Тёмный интерьер'];

function parseDraft(comment?: string | null) {
  if (!comment) return { step: 'photo' } as any;
  try {
    return JSON.parse(comment);
  } catch {
    return { step: 'photo' } as any;
  }
}

async function getPhotoDesignDraft(userId: string) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'photo_design_draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function startPhotoDesign(user: any, chatId: number) {
  await supabaseAdmin.from('leads').delete().eq('user_id', user.id).eq('status', 'photo_design_draft');

  await supabaseAdmin.from('leads').insert({
    user_id: user.id,
    name: user.name,
    phone: user.phone,
    interest: 'Подбор мебели и интерьера по фото комнаты',
    status: 'photo_design_draft',
    comment: JSON.stringify({ step: 'photo', source: 'room_photo_design' }),
  });

  await sendTelegramMessage(
    chatId,
    '📷 Подбор по фото комнаты\n\nОтправьте, пожалуйста, фото вашей комнаты.\n\nЛучше всего подойдёт фото, где видно:\n— основную стену;\n— пол;\n— окно или дверь;\n— примерный размер комнаты;\n— место, куда планируете поставить мебель.\n\nПосле фото я задам ещё 2 вопроса:\n1. Ваш ориентировочный бюджет.\n2. Желаемый стиль интерьера.\n\nПосле этого менеджер RichHouse подготовит для вас пример интерьера, подбор мебели и специальное предложение.',
    optionKeyboard(['Отмена'], false)
  );
}

export async function continuePhotoDesign(user: any, message: any, chatId: number) {
  const draft = await getPhotoDesignDraft(user.id);
  if (!draft) return false;

  const text = message.text || '';
  const data = parseDraft(draft.comment);

  if (text === 'Отмена') {
    await supabaseAdmin.from('leads').delete().eq('id', draft.id);
    await sendTelegramMessage(chatId, 'Заявка по фото отменена. Можно начать заново в любой момент.', mainKeyboard());
    return true;
  }

  if (data.step === 'photo') {
    const photos = message.photo || [];
    if (!photos.length) {
      await sendTelegramMessage(
        chatId,
        'Нужно отправить именно фото комнаты.\n\nПожалуйста, загрузите фото комнаты сюда в чат. На фото желательно показать стену, пол, окно/дверь и место, где планируете поставить мебель.',
        optionKeyboard(['Отмена'], false)
      );
      return true;
    }

    const bestPhoto = photos[photos.length - 1];
    await supabaseAdmin
      .from('leads')
      .update({ comment: JSON.stringify({ ...data, step: 'budget', photo_file_id: bestPhoto.file_id }) })
      .eq('id', draft.id);

    await sendTelegramMessage(
      chatId,
      'Фото комнаты получили ✅\n\nТеперь выберите ориентировочный бюджет на мебель для этой комнаты:',
      optionKeyboard(budgetOptions)
    );
    return true;
  }

  if (data.step === 'budget') {
    if (!text) return true;
    await supabaseAdmin
      .from('leads')
      .update({ budget: text, comment: JSON.stringify({ ...data, step: 'style', budget: text }) })
      .eq('id', draft.id);

    await sendTelegramMessage(
      chatId,
      'Отлично. Теперь выберите стиль, который вам ближе:',
      optionKeyboard(styleOptions)
    );
    return true;
  }

  if (data.step === 'style') {
    if (!text) return true;
    const photoFileId = data.photo_file_id;
    const budget = draft.budget || data.budget || 'не указан';
    const style = text;

    await supabaseAdmin
      .from('leads')
      .update({
        status: 'new',
        interest: 'Дизайн и подбор мебели по фото комнаты',
        budget,
        comment: JSON.stringify({ source: 'room_photo_design', photo_file_id: photoFileId, budget, style }),
      })
      .eq('id', draft.id);

    await supabaseAdmin
      .from('users')
      .update({ points: Number(user.points || 0) + 5000, tickets: Number(user.tickets || 0) + 1 })
      .eq('id', user.id);

    await supabaseAdmin.from('actions').insert({
      user_id: user.id,
      action_type: 'room_photo_design_request',
      points_added: 5000,
      tickets_added: 1,
      metadata: { budget, style, source: 'room_photo_design' },
    });

    const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;
    if (managerChatId && managerChatId !== '0' && photoFileId) {
      await sendTelegramPhoto(
        managerChatId,
        photoFileId,
        `📷 Новая заявка: дизайн по фото комнаты\n\nКлиент отправил фото комнаты и хочет получить подбор интерьера.\n\nИмя: ${user.name}\nТелефон: ${user.phone || '-'}\nTelegram: @${user.telegram_username || '-'}\nБюджет: ${budget}\nСтиль: ${style}\n\nЗадача менеджера: в течение 30 минут отправить клиенту пример интерьера комнаты, подбор мебели и специальное предложение RichHouse.`
      );
    }

    await sendTelegramMessage(
      chatId,
      `Заявка принята ✅\n\nФото комнаты: получено\nБюджет: ${budget}\nСтиль: ${style}\n\nВ течение 30 минут менеджер RichHouse подготовит и отправит вам по вашему запросу:\n\n— пример интерьера для вашей комнаты;\n— подбор мебели под ваш бюджет и стиль;\n— специальное предложение от RichHouse.\n\nВам начислено +5 000 баллов и +1 билет за заявку.`,
      mainKeyboard()
    );
    return true;
  }

  return false;
}
