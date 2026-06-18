import { NextRequest, NextResponse } from 'next/server';
import { setTelegramWebhook } from '@/lib/richhouse-sales-bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await setTelegramWebhook(process.env.ADMIN_SECRET);

  return NextResponse.json({ ok: Boolean(result), result });
}
