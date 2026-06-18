import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/richhouse-sales-bot';
import { saveTelegramEvent } from '@/lib/telegram-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getEventType(update: TelegramUpdate) {
  if (update.callback_query) return 'callback_query';
  if (update.message?.contact) return 'contact';
  if (update.message?.photo?.length) return 'photo';
  if (update.message?.text) return 'text';
  if (update.message) return 'message';
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const user = update.message?.from || update.callback_query?.from;
  const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id || null;
  const text = update.message?.text || update.callback_query?.data || update.message?.caption || null;

  await saveTelegramEvent({
    update_id: update.update_id,
    event_type: getEventType(update),
    telegram_chat_id: chatId,
    telegram_user_id: user?.id || null,
    telegram_username: user?.username || null,
    text,
    data: update as unknown as Record<string, unknown>,
  });

  await handleTelegramUpdate(update);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'RichHouse sales webhook with Supabase' });
}
