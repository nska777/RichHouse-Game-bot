import { getSupabaseServerClient } from '@/lib/supabase-server';

type StoredTelegramEvent = {
  update_id?: number;
  event_type: string;
  telegram_chat_id?: number | null;
  telegram_user_id?: number | null;
  telegram_username?: string | null;
  text?: string | null;
  data?: Record<string, unknown>;
};

export async function saveTelegramEvent(event: StoredTelegramEvent) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase.from('telegram_events').insert(event);

  if (error) console.error('Supabase telegram_events error:', error.message);
}
