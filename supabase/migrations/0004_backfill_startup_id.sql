-- =============================================================================
-- 0004_backfill_startup_id.sql
-- Backfill canonical `public.startups` rows from existing `public.startup_profiles`
-- and link `startup_profiles.startup_id` to the canonical row.
--
-- Depends on: 0003_create_unified_startup_model.sql
--
-- Guarantees:
--   * Idempotent — safe to re-run; no duplicate startups created
--   * Non-destructive — no deletes, no type changes, no column drops
--   * Additive — `startup_profiles.startup_id` is only filled where null
--   * Respects the partial unique index `uq_startups_user_active`
--     (one active startup per user_id)
--
-- Scope (explicitly NOT done here):
--   * No changes to `investor_matches` or `investor_matches_unified`
--   * No NOT NULL constraint on `startup_profiles.startup_id` yet
--   * No changes to application code
--   * Profiles with `user_id IS NULL` (e.g. ephemeral v2 rows) are skipped
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Create one canonical active `startups` row per distinct user_id,
--         using that user's earliest `startup_profile` as source of truth.
--
-- Mapping (best-effort; NULLs preserved where source column is NULL):
--   startup_name       ← startup_profiles.startup_name
--                        (fallback to 'Untitled startup' if NULL/blank)
--   description_long   ← startup_profiles.description
--   description_short  ← NULL (not invented; can be derived later)
--   country            ← startup_profiles.country
--   region             ← startup_profiles.region
--   stage_current      ← startup_profiles.stage
--   business_model     ← startup_profiles.business_model
--   target_market_geo  ← startup_profiles.target_markets
--   status             ← 'active'
--   source             ← 'startup_profiles_backfill'
--   created_at / updated_at ← source profile timestamps (preserve history)
--
-- Re-run safety: `WHERE NOT EXISTS` filters out users that already have an
-- active startup (whether inserted by this migration or created later by the
-- application). The partial unique index acts as a hard backstop.
-- -----------------------------------------------------------------------------
insert into public.startups (
  user_id,
  startup_name,
  description_short,
  description_long,
  country,
  region,
  stage_current,
  business_model,
  target_market_geo,
  status,
  source,
  created_at,
  updated_at
)
select distinct on (sp.user_id)
  sp.user_id,
  coalesce(nullif(trim(sp.startup_name), ''), 'Untitled startup') as startup_name,
  null::text                           as description_short,
  sp.description                       as description_long,
  sp.country,
  sp.region,
  sp.stage                             as stage_current,
  sp.business_model,
  sp.target_markets                    as target_market_geo,
  'active'                             as status,
  'startup_profiles_backfill'          as source,
  sp.created_at,
  sp.updated_at
from public.startup_profiles sp
where sp.user_id is not null
  and not exists (
    select 1
    from public.startups s
    where s.user_id = sp.user_id
      and s.status  = 'active'
  )
order by sp.user_id, sp.created_at asc;

-- -----------------------------------------------------------------------------
-- Step 2: Link every `startup_profiles` row (for users that now have a
--         canonical active startup) to that startup via `startup_id`.
--         Only fills rows where `startup_id` is currently null — existing
--         links are preserved.
-- -----------------------------------------------------------------------------
update public.startup_profiles sp
set startup_id = s.id
from public.startups s
where sp.startup_id is null
  and sp.user_id   is not null
  and s.user_id    = sp.user_id
  and s.status     = 'active';

-- -----------------------------------------------------------------------------
-- Step 3: Light narrative default — populate `product_summary` from the
--         legacy `description` field when product_summary is null. Strictly
--         scoped: no other narrative columns are touched (per spec,
--         "do not invent data beyond that").
-- -----------------------------------------------------------------------------
update public.startup_profiles
set product_summary = description
where product_summary is null
  and description is not null
  and trim(description) <> '';

-- -----------------------------------------------------------------------------
-- Step 4: Verification helper view — human-readable backfill status.
--
--   * startup_profile_id      — row id in startup_profiles
--   * user_id                 — owning user
--   * startup_name            — name stored on the profile
--   * startup_id              — canonical startup id (NULL = unbackfilled)
--   * canonical_startup_name  — name of the linked canonical startup
--   * canonical_status        — 'active' / 'archived' / etc.
--
-- Query this after applying the migration to spot unlinked rows
-- (e.g. ephemeral profiles with user_id IS NULL remain unlinked, by design):
--
--   select * from public.v_startup_profile_backfill_status
--   where startup_id is null;
-- -----------------------------------------------------------------------------
create or replace view public.v_startup_profile_backfill_status as
select
  sp.id            as startup_profile_id,
  sp.user_id,
  sp.startup_name,
  sp.startup_id,
  s.startup_name   as canonical_startup_name,
  s.status         as canonical_status
from public.startup_profiles sp
left join public.startups s
  on s.id = sp.startup_id;
