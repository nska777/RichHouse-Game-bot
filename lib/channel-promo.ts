import { getSupabaseServerClient } from '@/lib/supabase-server';

const CHANNEL = '@lubidom_uz';
const BUTTON_URL = 'https://t.me/RichHouseGameBot?start=channel';
const CAPTION = '🔥 <b>СКИДКИ ДО 60% НА МЕБЕЛЬ</b>\n\n🛏 Роскошные спальни, стильные решения и уют для вашего дома.\n\n🎁 Узнайте об актуальных скидках и получите консультацию менеджера в нашем боте.\n\n🇷🇺 Русский | 🇺🇿 O‘zbekcha';
const BUTTON = { inline_keyboard: [[{ text: '🔥 Забрать скидку до 60%', url: BUTTON_URL }]] };
type ChannelMessage = { message_id: number; chat: { id: number; username?: string }; text?: string; caption?: string; media_group_id?: string };
type PrivateMessage = { chat: { id: number; type?: string }; from?: { id: number }; caption?: string; text?: string; photo?: Array<{ file_id: string }> };
type PromoState = { photo: string; messageId?: number; mediaGroup?: string };

async function tg(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Missing Telegram bot token');
  const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(method + ': ' + JSON.stringify(json));
  return json.result;
}
async function state(): Promise<PromoState | null> {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('telegram_events').select('data')
    .eq('event_type', 'channel_promo_state').order('created_at', { ascending: false }).limit(1);
  if (error) throw new Error('Promo state read: ' + error.message);
  const payload = data?.[0]?.data;
  return payload && typeof payload.photo === 'string' ? payload as PromoState : null;
}
async function saveState(value: PromoState) {
  const db = getSupabaseServerClient();
  if (!db) throw new Error('Supabase is not configured; cannot maintain channel post safely');
  const { error } = await db.from('telegram_events').insert({
    event_type: 'channel_promo_state', text: 'RichHouse channel promo', data: value,
  });
  if (error) throw new Error('Promo state save: ' + error.message);
}
async function publish(photo: string, previous?: number, mediaGroup?: string) {
  const result = await tg('sendPhoto', {
    chat_id: CHANNEL, photo, caption: CAPTION, parse_mode: 'HTML', reply_markup: BUTTON,
  });
  try {
    await saveState({ photo, messageId: result.message_id, mediaGroup });
  } catch (err) {
    console.error('RichHouse promo: posted but state save failed', err);
    throw new Error('POSTED_BUT_NOT_SAVED');
  }
  if (previous && previous !== result.message_id) {
    try { await tg('deleteMessage', { chat_id: CHANNEL, message_id: previous }); }
    catch (err) { console.error('Could not delete old RichHouse promo:', err); }
  }
  return result;
}
async function isChannelAdmin(userId: number) {
  const user = await tg('getChatMember', { chat_id: CHANNEL, user_id: userId });
  return user.status === 'creator' || user.status === 'administrator';
}
export async function handlePromoPrivate(message: PrivateMessage): Promise<boolean> {
  const isPost = (message.caption || message.text || '').trim().startsWith('/post');
  if (!isPost) return false;
  if (!message.from?.id || !(await isChannelAdmin(message.from.id))) {
    await tg('sendMessage', { chat_id: message.chat.id, text: 'Публиковать пост может только администратор канала RichHouse.' });
    return true;
  }
  const photo = message.photo?.at(-1)?.file_id;
  if (!photo) {
    await tg('sendMessage', { chat_id: message.chat.id, text: 'Пришлите фотографию с подписью /post (именно как фото, не как файл).' });
    return true;
  }
  try {
    let old: PromoState | null = null;
    let stateUnavailable = false;
    try { old = await state(); }
    catch (err) { console.error('State unavailable, continuing with one-time post:', err); stateUnavailable = true; }
    if (stateUnavailable || !getSupabaseServerClient()) {
      const result = await tg('sendPhoto', {
        chat_id: CHANNEL, photo, caption: CAPTION, parse_mode: 'HTML', reply_markup: BUTTON,
      });
      await tg('sendMessage', { chat_id: message.chat.id,
        text: '✅ Пост опубликован в канале (№ ' + result.message_id + '). Автоматическое перемещение пока отключено: Supabase недоступен.' });
      return true;
    }
    try {
      await publish(photo, old?.messageId);
      await tg('sendMessage', { chat_id: message.chat.id, text: '✅ Фото, текст и кнопка опубликованы в канале RichHouse.' });
    } catch (err) {
      if (err instanceof Error && err.message === 'POSTED_BUT_NOT_SAVED') {
        await tg('sendMessage', { chat_id: message.chat.id, text: '✅ Пост опубликован, но Supabase недоступен: автоматическое перемещение пока не работает. Повторно не отправляйте.' });
        return true;
      }
      throw err;
    }
  } catch (err) {
    console.error('RichHouse promo:', err);
    const detail = err instanceof Error ? err.message : String(err);
    const text = detail === 'POSTED_BUT_NOT_SAVED'
      ? '⚠️ Пост мог появиться в канале, но не сохранился для автоматического обновления. Не отправляйте фото повторно, сначала проверьте канал.'
      : '❌ Публикация не прошла. Причина: ' + detail.slice(0, 260);
    await tg('sendMessage', { chat_id: message.chat.id, text });
  }
  return true;
}
export async function handleChannelPost(post: ChannelMessage) {
  if (post.chat.username?.toLowerCase() !== 'lubidom_uz') return;
  // Ignore the bot's own promotional post to avoid an infinite publishing loop.
  if (post.caption?.includes('СКИДКИ ДО 60% НА МЕБЕЛЬ') && post.caption.includes('Роскошные спальни')) return;
  const old = await state();
  if (!old?.photo || !old.messageId || post.message_id <= old.messageId) return;
  // Ignore subsequent items from the same album once processed.
  if (post.media_group_id && old.mediaGroup === post.media_group_id) return;
  try { await publish(old.photo, old.messageId, post.media_group_id); }
  catch (err) { console.error('RichHouse auto footer:', err); }
}
