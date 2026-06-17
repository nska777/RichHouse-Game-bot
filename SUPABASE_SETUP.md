# Supabase setup for RichHouse bot

## 1. Add environment variables in Vercel

Add these in Vercel → Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Do not commit the service role key to GitHub.

## 2. Create tables

Open Supabase → SQL Editor and run:

```sql
create table if not exists public.telegram_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  update_id bigint,
  event_type text not null,
  telegram_chat_id bigint,
  telegram_user_id bigint,
  telegram_username text,
  text text,
  data jsonb
);

create index if not exists telegram_events_created_at_idx on public.telegram_events (created_at desc);
create index if not exists telegram_events_user_id_idx on public.telegram_events (telegram_user_id);
create index if not exists telegram_events_chat_id_idx on public.telegram_events (telegram_chat_id);

create table if not exists public.richhouse_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  lead_type text not null,
  source text,
  room text,
  style text,
  budget text,
  salon text,
  visit_time text,
  designer_studio text,
  phone text,
  comment text,
  has_photo boolean not null default false,
  photo_file_id text,
  telegram_user_id bigint,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text
);

create index if not exists richhouse_leads_created_at_idx on public.richhouse_leads (created_at desc);
create index if not exists richhouse_leads_status_idx on public.richhouse_leads (status);
create index if not exists richhouse_leads_phone_idx on public.richhouse_leads (phone);
create index if not exists richhouse_leads_user_id_idx on public.richhouse_leads (telegram_user_id);

alter table public.telegram_events enable row level security;
alter table public.richhouse_leads enable row level security;
```

## 3. Security note

The bot uses the server-only service role key, so RLS can stay enabled. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## 4. Important

If the key was sent in a public chat or shared with anyone, rotate it in Supabase before production usage.
