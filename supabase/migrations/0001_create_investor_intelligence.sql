-- =============================================================================
-- Investor Intelligence Engine — Foundation Schema
-- =============================================================================
-- Creates five tables to support investor discovery, deal tracking, and
-- conservative investor↔deal linking. Designed to scale from Africa seed data
-- to US / Europe / MENA / Asia datasets.
--
-- Tables: investors, investor_activity_yearly, deals, deal_investors, import_runs
-- =============================================================================

-- Ensure uuid + btree_gin extensions are available ---------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper (shared)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- investors
-- ===========================================================================
create table if not exists public.investors (
  id                  uuid primary key default gen_random_uuid(),
  investor_name       text not null,
  normalized_name     text not null,
  fund_name           text,
  investor_type       text,
  website             text,
  linkedin_url        text,
  hq_city             text,
  hq_country          text,
  hq_region           text,
  geo_focus           jsonb,
  stage_focus         jsonb,
  sector_focus        jsonb,
  check_min_usd       numeric,
  check_max_usd       numeric,
  lead_rounds         boolean,
  follow_on_only      boolean,
  thesis_text         text,
  source              text not null,
  source_url          text,
  source_confidence   numeric,
  last_verified_at    timestamptz,
  import_metadata     jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Practical uniqueness: (source, normalized_name, website). NULLS NOT DISTINCT
-- so rows without websites still de-duplicate against each other.
-- (Postgres 15+; Supabase supports this.)
create unique index if not exists investors_source_norm_site_uidx
  on public.investors (source, normalized_name, website)
  nulls not distinct;

create index if not exists investors_normalized_name_idx
  on public.investors (normalized_name);

create index if not exists investors_hq_country_idx
  on public.investors (hq_country);

create index if not exists investors_hq_region_idx
  on public.investors (hq_region);

drop trigger if exists trg_investors_updated_at on public.investors;
create trigger trg_investors_updated_at
  before update on public.investors
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- investor_activity_yearly
-- ===========================================================================
create table if not exists public.investor_activity_yearly (
  id            uuid primary key default gen_random_uuid(),
  investor_id   uuid not null references public.investors(id) on delete cascade,
  activity_year int  not null,
  deal_count    int  not null default 0,
  source        text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists investor_activity_year_source_uidx
  on public.investor_activity_yearly (investor_id, activity_year, source);

create index if not exists investor_activity_investor_idx
  on public.investor_activity_yearly (investor_id);

-- ===========================================================================
-- deals
-- ===========================================================================
create table if not exists public.deals (
  id                      uuid primary key default gen_random_uuid(),
  deal_external_key       text,
  company_name            text not null,
  normalized_company_name text not null,
  company_country         text,
  company_region          text,
  sector                  text,
  subsector               text,
  business_model          text,
  round_type              text,
  amount_raised_usd       numeric,
  amount_raised_original  text,
  currency                text,
  announced_at            date,
  source                  text not null,
  import_metadata         jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- For upsert idempotency when an external key is present.
create unique index if not exists deals_source_external_key_uidx
  on public.deals (source, deal_external_key)
  where deal_external_key is not null;

-- Fallback idempotency when no external key: (source, normalized_company, announced_at, round_type).
-- Two nulls are distinct in standard Postgres unique indexes, which is what we want
-- (avoids accidentally collapsing unrelated undated rows).
create unique index if not exists deals_source_company_date_round_uidx
  on public.deals (source, normalized_company_name, announced_at, round_type)
  where deal_external_key is null;

create index if not exists deals_normalized_company_idx
  on public.deals (normalized_company_name);

create index if not exists deals_company_country_idx
  on public.deals (company_country);

create index if not exists deals_company_region_idx
  on public.deals (company_region);

create index if not exists deals_round_type_idx
  on public.deals (round_type);

create index if not exists deals_announced_at_idx
  on public.deals (announced_at);

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- deal_investors
-- ===========================================================================
create table if not exists public.deal_investors (
  id                            uuid primary key default gen_random_uuid(),
  deal_id                       uuid not null references public.deals(id) on delete cascade,
  investor_id                   uuid references public.investors(id) on delete set null,
  investor_name_raw             text not null,
  normalized_investor_name_raw  text not null,
  role                          text,
  is_lead                       boolean,
  match_confidence              numeric,
  match_method                  text,
  created_at                    timestamptz not null default now()
);

-- Prevent duplicate (deal, raw investor) rows on re-import.
create unique index if not exists deal_investors_deal_rawnorm_uidx
  on public.deal_investors (deal_id, normalized_investor_name_raw);

create index if not exists deal_investors_deal_idx
  on public.deal_investors (deal_id);

create index if not exists deal_investors_investor_idx
  on public.deal_investors (investor_id);

create index if not exists deal_investors_rawnorm_idx
  on public.deal_investors (normalized_investor_name_raw);

-- ===========================================================================
-- import_runs
-- ===========================================================================
create table if not exists public.import_runs (
  id            uuid primary key default gen_random_uuid(),
  import_type   text not null,
  source        text not null,
  file_name     text,
  status        text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  stats         jsonb,
  errors        jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists import_runs_type_source_idx
  on public.import_runs (import_type, source);

create index if not exists import_runs_started_at_idx
  on public.import_runs (started_at desc);
