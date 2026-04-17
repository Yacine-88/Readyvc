-- =============================================================================
-- Investor Intelligence Engine — Phase 2: Matching
-- =============================================================================
-- Adds:
--   * startup_profiles — the founder-side inputs used to drive matching
--   * investor_matches  — persisted scoring outputs, versioned per run
--
-- Depends on Phase 1 (0001_create_investor_intelligence.sql):
--   * public.set_updated_at() trigger function
--   * public.investors table
-- =============================================================================

create extension if not exists "pgcrypto";

-- ===========================================================================
-- startup_profiles
-- ===========================================================================
create table if not exists public.startup_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid,
  startup_name            text not null,
  description             text,
  country                 text,
  region                  text,
  stage                   text,
  sectors                 jsonb,
  business_model          text,
  target_markets          jsonb,
  revenue_model           text,
  valuation_estimate      numeric,
  fundraising_target_usd  numeric,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists startup_profiles_user_idx
  on public.startup_profiles (user_id);

drop trigger if exists trg_startup_profiles_updated_at on public.startup_profiles;
create trigger trg_startup_profiles_updated_at
  before update on public.startup_profiles
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- investor_matches
-- ===========================================================================
create table if not exists public.investor_matches (
  id                   uuid primary key default gen_random_uuid(),
  startup_profile_id   uuid not null references public.startup_profiles(id) on delete cascade,
  investor_id          uuid not null references public.investors(id) on delete cascade,
  score_total          numeric not null,
  score_stage          numeric,
  score_sector         numeric,
  score_geo            numeric,
  score_activity       numeric,
  score_check_size     numeric,
  score_thesis         numeric,
  reasoning            text,
  rank_position        int,
  scoring_version      text not null default 'v1',
  created_at           timestamptz not null default now()
);

create unique index if not exists investor_matches_profile_investor_version_uidx
  on public.investor_matches (startup_profile_id, investor_id, scoring_version);

create index if not exists investor_matches_profile_idx
  on public.investor_matches (startup_profile_id);

create index if not exists investor_matches_investor_idx
  on public.investor_matches (investor_id);
