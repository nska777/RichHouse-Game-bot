create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  telegram_username text,
  name text,
  phone text unique,
  points integer not null default 0,
  tickets integer not null default 0,
  streak_days integer not null default 0,
  invited_by uuid references users(id),
  last_box_opened_at timestamptz,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action_type text not null,
  points_added integer not null default 0,
  tickets_added integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists daily_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  reward_type text not null,
  points integer not null default 0,
  tickets integer not null default 0,
  gift text,
  opened_date date not null,
  created_at timestamptz not null default now(),
  unique(user_id, opened_date)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  name text,
  phone text,
  interest text,
  room_type text,
  budget text,
  comment text,
  status text not null default 'new',
  manager_comment text,
  created_at timestamptz not null default now()
);

create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  draw_type text not null,
  prize_title text not null,
  prize_amount integer,
  winner_user_id uuid references users(id),
  draw_date date not null,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
alter table actions enable row level security;
alter table daily_boxes enable row level security;
alter table leads enable row level security;
alter table draws enable row level security;
