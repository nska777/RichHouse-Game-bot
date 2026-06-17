import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  if (!token || !rawAppUrl) {
    return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 500 });
  }

  const baseUrl = rawAppUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const webhookUrl = `https://${baseUrl}/api/telegram/webhook-sales?secret=${encodeURIComponent(secret)}`;
  const telegramUrl = 'https://api.telegram.org/bot' + token + '/setWebhook';

  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
  });

  const result = await response.json();

  return NextResponse.json({ ok: response.ok, webhookUrl, result });
}
