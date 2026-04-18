-- =============================================================================
-- Cleanup ephemeral startup_profiles rows created by the zero-friction
-- matching flow (one-click "Find Investors" without an authenticated user
-- binding).
--
-- These rows are tagged with `revenue_model = '__ephemeral_v2__'` and
-- `user_id IS NULL` by POST /api/matching/run when called with a
-- `startup_context` payload.
--
-- This is a temporary safeguard. Once the unified `startups` / `startup_id`
-- model lands, the API will upsert against `startup_id` instead of creating
-- throwaway rows, and this script becomes unnecessary.
--
-- USAGE (dry-run first, then delete):
--
--   -- 1. Inspect what would be removed (rows older than 30 days):
--   select id, startup_name, created_at
--   from public.startup_profiles
--   where revenue_model = '__ephemeral_v2__'
--     and user_id is null
--     and created_at < now() - interval '30 days';
--
--   -- 2. Delete them (cascades to investor_matches via ON DELETE CASCADE):
--   delete from public.startup_profiles
--   where revenue_model = '__ephemeral_v2__'
--     and user_id is null
--     and created_at < now() - interval '30 days';
--
-- Scheduling: run nightly via Supabase pg_cron or an external scheduler.
-- =============================================================================

-- Safe default: dry-run select, commented delete.
select
  id,
  startup_name,
  country,
  stage,
  created_at
from public.startup_profiles
where revenue_model = '__ephemeral_v2__'
  and user_id is null
  and created_at < now() - interval '30 days'
order by created_at desc;

-- Uncomment to actually delete:
-- delete from public.startup_profiles
-- where revenue_model = '__ephemeral_v2__'
--   and user_id is null
--   and created_at < now() - interval '30 days';
