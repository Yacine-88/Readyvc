-- =========================================================
-- 0003_create_unified_startup_model.sql
-- Adds unified startup-centric model without breaking existing flows
-- =========================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  startup_name text not null,
  legal_name text,
  tagline text,
  description_short text,
  description_long text,
  website text,
  country text,
  region text,
  city text,
  founded_at date,
  team_size integer,
  industry_primary text,
  industry_secondary text,
  business_model text,
  target_market_geo jsonb,
  stage_current text,
  status text not null default 'active',
  source text not null default 'vcready_unified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_startups_user_id on public.startups(user_id);
create index if not exists idx_startups_stage_current on public.startups(stage_current);
create index if not exists idx_startups_country on public.startups(country);

create unique index if not exists uq_startups_user_active
  on public.startups(user_id, status)
  where status = 'active';

drop trigger if exists trg_startups_updated_at on public.startups;
create trigger trg_startups_updated_at
before update on public.startups
for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'startup_profiles'
  ) then
    alter table public.startup_profiles
      add column if not exists startup_id uuid;

    alter table public.startup_profiles
      add column if not exists problem text,
      add column if not exists solution text,
      add column if not exists product_summary text,
      add column if not exists customer_segment text,
      add column if not exists icp text,
      add column if not exists market_size_tam numeric,
      add column if not exists market_size_sam numeric,
      add column if not exists market_size_som numeric,
      add column if not exists go_to_market text,
      add column if not exists traction_summary text,
      add column if not exists fundraising_story text,
      add column if not exists pitch_positioning text,
      add column if not exists last_completeness_score numeric;

    if not exists (
      select 1
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'startup_profiles'
        and constraint_name = 'fk_startup_profiles_startup'
    ) then
      alter table public.startup_profiles
        add constraint fk_startup_profiles_startup
        foreign key (startup_id) references public.startups(id)
        on delete cascade;
    end if;
  else
    create table public.startup_profiles (
      id uuid primary key default gen_random_uuid(),
      startup_id uuid not null references public.startups(id) on delete cascade,
      user_id uuid,
      startup_name text,
      description text,
      country text,
      region text,
      stage text,
      sectors jsonb,
      business_model text,
      target_markets jsonb,
      revenue_model text,
      valuation_estimate numeric,
      fundraising_target_usd numeric,
      problem text,
      solution text,
      product_summary text,
      customer_segment text,
      icp text,
      market_size_tam numeric,
      market_size_sam numeric,
      market_size_som numeric,
      go_to_market text,
      traction_summary text,
      fundraising_story text,
      pitch_positioning text,
      last_completeness_score numeric,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

create index if not exists idx_startup_profiles_startup_id on public.startup_profiles(startup_id);

drop trigger if exists trg_startup_profiles_updated_at on public.startup_profiles;
create trigger trg_startup_profiles_updated_at
before update on public.startup_profiles
for each row execute function public.set_updated_at();

create table if not exists public.startup_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  snapshot_date date not null default current_date,
  revenue_mrr numeric,
  revenue_arr numeric,
  growth_mom numeric,
  burn_monthly numeric,
  runway_months numeric,
  cac numeric,
  ltv numeric,
  churn_rate numeric,
  gross_margin numeric,
  active_users integer,
  paying_customers integer,
  nps numeric,
  retention_30d numeric,
  retention_90d numeric,
  custom_metrics_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_startup_metrics_snapshots_startup_id on public.startup_metrics_snapshots(startup_id);
create index if not exists idx_startup_metrics_snapshots_snapshot_date on public.startup_metrics_snapshots(snapshot_date desc);

create table if not exists public.fundraising_profiles (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  raising_now boolean default false,
  target_raise_usd numeric,
  min_raise_usd numeric,
  max_raise_usd numeric,
  planned_round_type text,
  use_of_funds text,
  timeline_target text,
  dilution_target numeric,
  lead_investor_target boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(startup_id)
);

create index if not exists idx_fundraising_profiles_startup_id on public.fundraising_profiles(startup_id);

drop trigger if exists trg_fundraising_profiles_updated_at on public.fundraising_profiles;
create trigger trg_fundraising_profiles_updated_at
before update on public.fundraising_profiles
for each row execute function public.set_updated_at();

create table if not exists public.valuation_runs (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  run_label text,
  stage_at_run text,
  method_weights_json jsonb,
  low_valuation numeric,
  base_valuation numeric,
  high_valuation numeric,
  vc_method_value numeric,
  scorecard_value numeric,
  berkus_value numeric,
  comparables_value numeric,
  revenue_multiple_value numeric,
  assumptions_json jsonb,
  interpretation_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_valuation_runs_startup_id on public.valuation_runs(startup_id);
create index if not exists idx_valuation_runs_created_at on public.valuation_runs(created_at desc);

create table if not exists public.readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  module text not null,
  score numeric,
  max_score numeric,
  breakdown_json jsonb,
  gaps_json jsonb,
  recommendations_json jsonb,
  version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_readiness_assessments_startup_id on public.readiness_assessments(startup_id);
create index if not exists idx_readiness_assessments_module on public.readiness_assessments(module);

create table if not exists public.startup_health_scores (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  readiness_score numeric,
  metrics_score numeric,
  fundraising_score numeric,
  story_score numeric,
  data_room_score numeric,
  investor_fit_score numeric,
  global_score numeric,
  version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_startup_health_scores_startup_id on public.startup_health_scores(startup_id);

create table if not exists public.pitch_assets (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  deck_url text,
  deck_text_extracted text,
  one_liner text,
  elevator_pitch text,
  investment_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(startup_id)
);

create index if not exists idx_pitch_assets_startup_id on public.pitch_assets(startup_id);

drop trigger if exists trg_pitch_assets_updated_at on public.pitch_assets;
create trigger trg_pitch_assets_updated_at
before update on public.pitch_assets
for each row execute function public.set_updated_at();

create table if not exists public.qa_sessions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  session_type text,
  context_json jsonb,
  overall_score numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_sessions_startup_id on public.qa_sessions(startup_id);

create table if not exists public.qa_responses (
  id uuid primary key default gen_random_uuid(),
  qa_session_id uuid not null references public.qa_sessions(id) on delete cascade,
  question_category text,
  question_text text not null,
  answer_text text,
  score numeric,
  feedback text,
  risk_level text,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_responses_qa_session_id on public.qa_responses(qa_session_id);

create table if not exists public.data_room_assets (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  asset_type text not null,
  title text not null,
  file_url text,
  status text,
  visibility text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_room_assets_startup_id on public.data_room_assets(startup_id);
create index if not exists idx_data_room_assets_asset_type on public.data_room_assets(asset_type);

drop trigger if exists trg_data_room_assets_updated_at on public.data_room_assets;
create trigger trg_data_room_assets_updated_at
before update on public.data_room_assets
for each row execute function public.set_updated_at();

create table if not exists public.data_room_completeness (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  legal_docs_score numeric,
  financial_docs_score numeric,
  corporate_docs_score numeric,
  product_docs_score numeric,
  traction_docs_score numeric,
  overall_score numeric,
  missing_items_json jsonb,
  created_at timestamptz not null default now(),
  unique(startup_id)
);

create index if not exists idx_data_room_completeness_startup_id on public.data_room_completeness(startup_id);

create table if not exists public.startup_context_cache (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  context_version text not null default 'v1',
  context_json jsonb not null,
  completeness_score numeric,
  generated_at timestamptz not null default now(),
  unique(startup_id, context_version)
);

create index if not exists idx_startup_context_cache_startup_id on public.startup_context_cache(startup_id);

create table if not exists public.investor_matches_unified (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  startup_context_snapshot_json jsonb,
  score_total numeric not null,
  score_geo numeric,
  score_sector numeric,
  score_stage numeric,
  score_activity numeric,
  score_check_size numeric,
  score_thesis numeric,
  reasoning text,
  rank_position integer,
  scoring_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create index if not exists idx_investor_matches_unified_startup_id on public.investor_matches_unified(startup_id);
create index if not exists idx_investor_matches_unified_investor_id on public.investor_matches_unified(investor_id);

create unique index if not exists uq_investor_matches_unified
  on public.investor_matches_unified(startup_id, investor_id, scoring_version);

create table if not exists public.investor_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  draft_type text,
  subject_line text,
  message_body text,
  angle text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_investor_outreach_drafts_startup_id on public.investor_outreach_drafts(startup_id);
create index if not exists idx_investor_outreach_drafts_investor_id on public.investor_outreach_drafts(investor_id);

drop trigger if exists trg_investor_outreach_drafts_updated_at on public.investor_outreach_drafts;
create trigger trg_investor_outreach_drafts_updated_at
before update on public.investor_outreach_drafts
for each row execute function public.set_updated_at();

create table if not exists public.investor_pipeline (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  investor_id uuid not null references public.investors(id) on delete cascade,
  status text not null default 'not_contacted',
  priority_tier text,
  contacted_at timestamptz,
  last_interaction_at timestamptz,
  next_step text,
  notes text,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(startup_id, investor_id)
);

create index if not exists idx_investor_pipeline_startup_id on public.investor_pipeline(startup_id);
create index if not exists idx_investor_pipeline_investor_id on public.investor_pipeline(investor_id);
create index if not exists idx_investor_pipeline_status on public.investor_pipeline(status);

drop trigger if exists trg_investor_pipeline_updated_at on public.investor_pipeline;
create trigger trg_investor_pipeline_updated_at
before update on public.investor_pipeline
for each row execute function public.set_updated_at();
