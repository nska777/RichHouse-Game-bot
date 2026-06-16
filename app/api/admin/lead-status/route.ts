import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

const allowedStatuses = new Set(['new', 'contacted', 'visited', 'won', 'lost']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const leadId = url.searchParams.get('id');
  const status = url.searchParams.get('status');

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!leadId || !status || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/admin?secret=${secret}`, request.url));
}
