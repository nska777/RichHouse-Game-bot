import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('created_at,name,phone,interest,status,comment,manager_comment')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ['Дата', 'Имя', 'Телефон', 'Интерес', 'Статус', 'Комментарий', 'Комментарий менеджера'];
  const rows = (data || []).map((lead) => [
    lead.created_at,
    lead.name,
    lead.phone,
    lead.interest,
    lead.status,
    lead.comment,
    lead.manager_comment,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="richhouse-game-leads.csv"',
    },
  });
}
