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

-- ─── org_id on founder profiles (B2B) ───────────────────────────────────────
-- Uncomment when org invites are implemented.
-- alter table founder_profiles add column if not exists org_id uuid references organizations(id) on delete set null;

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

-- =============================================================================
-- FUTURE TABLES (do not run yet — schema is defined for reference only)
-- =============================================================================

-- ─── [FUTURE] Organizations (B2B: incubators / accelerators) ─────────────────
--
-- create table if not exists organizations (
--   id                     uuid primary key default gen_random_uuid(),
--   name                   text not null,
--   type                   text not null,  -- 'incubator' | 'accelerator' | 'vc_fund' | 'university' | 'other'
--   website                text,
--   logo_url               text,
--   subscription_tier      text not null default 'free',  -- 'free' | 'starter' | 'growth' | 'enterprise'
--   subscription_expires_at timestamptz,
--   created_at             timestamptz default now()
-- );
--
-- alter table organizations enable row level security;
-- -- Org members can read their org
-- create policy "Org members can read org"
--   on organizations for select
--   using (exists (
--     select 1 from org_members where org_id = organizations.id and user_id = auth.uid()
--   ));

-- ─── [FUTURE] Org members ─────────────────────────────────────────────────────
--
-- create table if not exists org_members (
--   id         uuid primary key default gen_random_uuid(),
--   org_id     uuid references organizations(id) on delete cascade not null,
--   user_id    uuid references auth.users(id) on delete cascade not null,
--   role       text not null default 'coach',  -- 'owner' | 'admin' | 'coach'
--   joined_at  timestamptz default now(),
--   unique(org_id, user_id)
-- );
--
-- alter table org_members enable row level security;
-- create policy "Members can read their own memberships"
--   on org_members for select
--   using (auth.uid() = user_id);

-- ─── [FUTURE] Org invites ─────────────────────────────────────────────────────
--
-- create table if not exists org_invites (
--   id         uuid primary key default gen_random_uuid(),
--   org_id     uuid references organizations(id) on delete cascade not null,
--   token      text not null unique,
--   email      text,  -- null = open invite link
--   expires_at timestamptz not null,
--   used_at    timestamptz
-- );

-- ─── [FUTURE] Investors (VC matching) ────────────────────────────────────────
--
-- create table if not exists investors (
--   id                  uuid primary key default gen_random_uuid(),
--   name                text not null,
--   firm                text not null,
--   type                text not null,     -- 'VC' | 'Angel' | 'Family Office' | 'Corporate VC' | 'Accelerator'
--   geographies         text[] not null default '{}',
--   sectors             text[] not null default '{}',
--   stages              text[] not null default '{}',
--   min_readiness_score integer not null default 0,
--   min_mrr             integer not null default 0,
--   min_growth_rate     integer not null default 0,
--   min_runway_months   integer not null default 0,
--   url                 text,
--   created_at          timestamptz default now()
-- );
-- -- Public read (no RLS restriction needed for investor directory)
-- alter table investors enable row level security;
-- create policy "Anyone can read investors" on investors for select using (true);

-- ─── [FUTURE] Investor matches (cached match results) ────────────────────────
--
-- create table if not exists investor_matches (
--   id           uuid primary key default gen_random_uuid(),
--   user_id      uuid references auth.users(id) on delete cascade not null,
--   investor_id  uuid references investors(id) on delete cascade not null,
--   score        integer not null,         -- 0–100 match quality
--   reasons      text[] not null default '{}',
--   matched_at   timestamptz default now(),
--   unique(user_id, investor_id)
-- );
--
-- alter table investor_matches enable row level security;
-- create policy "Users can read own matches"
--   on investor_matches for select
--   using (auth.uid() = user_id);
