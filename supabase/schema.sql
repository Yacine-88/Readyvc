-- VCReady database schema
-- Run this in Supabase SQL Editor after creating your project.

-- ─── Founder profiles ─────────────────────────────────────────────────────────
create table if not exists founder_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  name          text not null,
  email         text not null,
  startup_name  text not null,
  country       text,
  sector        text,
  stage         text,
  has_raised_before boolean,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table founder_profiles enable row level security;

create policy "Users can read own profile"
  on founder_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on founder_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on founder_profiles for update
  using (auth.uid() = user_id);

-- ─── Tool saves (generic JSONB — one row per user per tool) ──────────────────
create table if not exists tool_saves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  tool       text not null,  -- 'metrics' | 'valuation' | 'qa' | 'captable' | 'pitch' | 'dataroom'
  score      integer not null default 0,
  inputs     jsonb,          -- full form state for restoration
  saved_at   timestamptz default now(),
  unique(user_id, tool)
);

alter table tool_saves enable row level security;

create policy "Users can read own tool saves"
  on tool_saves for select
  using (auth.uid() = user_id);

create policy "Users can upsert own tool saves"
  on tool_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tool saves"
  on tool_saves for update
  using (auth.uid() = user_id);

-- ─── Readiness history ────────────────────────────────────────────────────────
create table if not exists readiness_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  overall_score   integer not null,
  metrics_score   integer not null default 0,
  valuation_score integer not null default 0,
  qa_score        integer not null default 0,
  cap_table_score integer not null default 0,
  pitch_score     integer not null default 0,
  dataroom_score  integer not null default 0,
  saved_at        timestamptz default now()
);

alter table readiness_history enable row level security;

create policy "Users can read own history"
  on readiness_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on readiness_history for insert
  with check (auth.uid() = user_id);

-- ─── Completed flow steps ─────────────────────────────────────────────────────
create table if not exists completed_steps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  step         text not null,
  completed_at timestamptz default now(),
  unique(user_id, step)
);

alter table completed_steps enable row level security;

create policy "Users can read own steps"
  on completed_steps for select
  using (auth.uid() = user_id);

create policy "Users can insert own steps"
  on completed_steps for insert
  with check (auth.uid() = user_id);
