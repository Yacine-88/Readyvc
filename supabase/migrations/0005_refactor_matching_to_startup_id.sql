-- =============================================================================
-- 0005_refactor_matching_to_startup_id.sql
-- Bridge legacy `investor_matches` → unified `investor_matches_unified` and
-- expose compatibility views keyed by `startup_id`.
--
-- Depends on:
--   * 0003_create_unified_startup_model.sql (startups, investor_matches_unified,
--                                            startup_context_cache)
--   * 0004_backfill_startup_id.sql         (startup_profiles.startup_id populated)
--
-- Guarantees:
--   * Idempotent — `ON CONFLICT DO NOTHING` on unique matches index,
--     `CREATE OR REPLACE VIEW` for every view
--   * Non-destructive — no deletes, no column drops, no type changes
--   * Legacy `investor_matches` and `startup_profiles` left in place
--
-- Explicitly NOT done here:
--   * No application code changes
--   * No DROP of legacy investor_matches
--   * No change to scoring logic
--   * Legacy rows whose profile has `startup_id IS NULL` (ephemeral v2 rows
--     created by zero-friction flow without a linked canonical startup) are
--     skipped — they cannot be resolved to a canonical startup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Backfill `investor_matches_unified` from legacy `investor_matches`.
--
-- Path: investor_matches.startup_profile_id → startup_profiles.id
--                                           → startup_profiles.startup_id
--
-- For each (startup_id, investor_id, scoring_version) tuple we pick the
-- FRESHEST legacy row (by created_at desc). `ON CONFLICT DO NOTHING` ensures
-- re-runs never duplicate and never overwrite an existing unified row — the
-- unified table is considered authoritative once a row is present.
--
-- `startup_context_snapshot_json` is left NULL — legacy rows pre-date the
-- snapshot concept and we do not invent it retroactively.
-- -----------------------------------------------------------------------------
insert into public.investor_matches_unified (
  startup_id,
  investor_id,
  startup_context_snapshot_json,
  score_total,
  score_geo,
  score_sector,
  score_stage,
  score_activity,
  score_check_size,
  score_thesis,
  reasoning,
  rank_position,
  scoring_version,
  created_at
)
select distinct on (sp.startup_id, im.investor_id, im.scoring_version)
  sp.startup_id,
  im.investor_id,
  null::jsonb            as startup_context_snapshot_json,
  im.score_total,
  im.score_geo,
  im.score_sector,
  im.score_stage,
  im.score_activity,
  im.score_check_size,
  im.score_thesis,
  im.reasoning,
  im.rank_position,
  im.scoring_version,
  im.created_at
from public.investor_matches im
join public.startup_profiles sp
  on sp.id = im.startup_profile_id
where sp.startup_id is not null
order by sp.startup_id, im.investor_id, im.scoring_version, im.created_at desc
on conflict (startup_id, investor_id, scoring_version) do nothing;

-- -----------------------------------------------------------------------------
-- Step 2: Compatibility view — latest match per (startup_id, investor_id).
--
-- UNION over BOTH sources so the view remains truthful regardless of which
-- table the application writes to during the transition:
--   * `investor_matches_unified` — post-cutover writes land here
--   * `investor_matches`         — legacy writes land here (still active)
--
-- Legacy rows are surfaced only when their profile has a populated
-- `startup_id` (i.e. 0004 backfill succeeded).
--
-- `DISTINCT ON (startup_id, investor_id) ORDER BY … created_at DESC` picks
-- the freshest row across both sources.
-- -----------------------------------------------------------------------------
create or replace view public.v_investor_matches_latest as
with all_matches as (
  select
    startup_id,
    investor_id,
    scoring_version,
    score_total,
    score_geo,
    score_sector,
    score_stage,
    score_activity,
    score_check_size,
    score_thesis,
    reasoning,
    rank_position,
    created_at,
    'unified'::text as source_table
  from public.investor_matches_unified
  union all
  select
    sp.startup_id,
    im.investor_id,
    im.scoring_version,
    im.score_total,
    im.score_geo,
    im.score_sector,
    im.score_stage,
    im.score_activity,
    im.score_check_size,
    im.score_thesis,
    im.reasoning,
    im.rank_position,
    im.created_at,
    'legacy'::text as source_table
  from public.investor_matches im
  join public.startup_profiles sp
    on sp.id = im.startup_profile_id
  where sp.startup_id is not null
)
select distinct on (startup_id, investor_id)
  startup_id,
  investor_id,
  scoring_version,
  score_total,
  score_geo,
  score_sector,
  score_stage,
  score_activity,
  score_check_size,
  score_thesis,
  reasoning,
  rank_position,
  created_at,
  source_table
from all_matches
order by startup_id, investor_id, created_at desc;

-- -----------------------------------------------------------------------------
-- Step 3: Compatibility view — latest context cache row per startup.
--
-- `startup_context_cache` is unique on (startup_id, context_version), so a
-- single startup can have multiple versions materialized. This view exposes
-- the most recently generated one regardless of version.
-- -----------------------------------------------------------------------------
create or replace view public.v_startup_context_latest as
select distinct on (startup_id)
  startup_id,
  context_version,
  context_json,
  completeness_score,
  generated_at
from public.startup_context_cache
order by startup_id, generated_at desc;

-- -----------------------------------------------------------------------------
-- Step 4: Compatibility view — active startups only.
--
-- Trivial filter, but provides a stable surface so downstream queries / SQL
-- consumers don't have to repeat the `status='active'` predicate (and can be
-- later extended with soft-delete semantics without changing callers).
-- -----------------------------------------------------------------------------
create or replace view public.v_active_startups as
select *
from public.startups
where status = 'active';
