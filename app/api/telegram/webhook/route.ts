import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/richhouse-sales-bot';
import { handlePromoPrivate, handleChannelPost } from '@/lib/channel-promo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const extended = update as TelegramUpdate & { channel_post?: Parameters<typeof handleChannelPost>[0] };
  if (extended.channel_post) await handleChannelPost(extended.channel_post);
  else if (!update.message || !(await handlePromoPrivate(update.message))) await handleTelegramUpdate(update);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'RichHouse Telegram webhook' });
}
