import { getSupabaseServerClient } from '@/lib/supabase-server';

type LeadRecord = {
  lead_type: string;
  source?: string | null;
  room?: string | null;
  style?: string | null;
  budget?: string | null;
  salon?: string | null;
  visit_time?: string | null;
  designer_studio?: string | null;
  phone?: string | null;
  comment?: string | null;
  has_photo?: boolean;
  photo_file_id?: string | null;
  telegram_user_id?: number | null;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  telegram_last_name?: string | null;
  status?: string;
};

export async function saveLead(record: LeadRecord) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase.from('richhouse_leads').insert({
    ...record,
    status: record.status || 'new',
  });

  if (error) console.error('Supabase richhouse_leads error:', error.message);
}
