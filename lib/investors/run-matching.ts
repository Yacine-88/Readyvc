/**
 * Orchestrator: resolve a startup profile, score every candidate investor in
 * a single batched pass, optionally persist the top-K to investor_matches.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadInvestorContexts } from "./inference";
import { scoreInvestor } from "./scoring";
import { mapStartupStage } from "./stage-mapping";
import type {
  MatchBreakdown,
  RankedMatch,
  StartupContext,
  StartupProfileInput,
} from "./types";

const SCORING_VERSION = "v1";
const DEFAULT_TOP_K = 50;
const DEFAULT_CANDIDATE_LIMIT = 2000;

export type RunMatchingWriteTarget =
  | { kind: "legacy"; startupProfileId: string }
  | { kind: "unified"; startupId: string; contextSnapshot?: unknown };

export interface RunMatchingArgs {
  startupProfileId?: string | null;
  profile?: StartupProfileInput;
  topK?: number;
  persist?: boolean;
  candidateLimit?: number;
  writeTarget?: RunMatchingWriteTarget;
}

export interface RunMatchingResult {
  profile: StartupContext;
  matches: RankedMatch[];
  saved: number;
}

interface ProfileRow {
  id: string;
  startup_name: string;
  country: string | null;
  region: string | null;
  stage: string | null;
  sectors: unknown;
  business_model: string | null;
  target_markets: unknown;
  fundraising_target_usd: number | null;
}

function asStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((x) => (x as string).trim())
      .filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function toStartupContext(
  row: ProfileRow | null,
  input: StartupProfileInput | null,
  profileId: string | null
): StartupContext {
  if (row) {
    return {
      startup_profile_id: row.id,
      startup_name: row.startup_name,
      country: row.country,
      region: row.region,
      stage: mapStartupStage(row.stage),
      sectors: asStringArray(row.sectors).map((s) => s.toLowerCase()),
      business_model: row.business_model,
      target_markets: asStringArray(row.target_markets),
      fundraising_target_usd: row.fundraising_target_usd,
    };
  }
  if (input) {
    return {
      startup_profile_id: profileId,
      startup_name: input.startup_name,
      country: input.country ?? null,
      region: input.region ?? null,
      stage: mapStartupStage(input.stage),
      sectors: (input.sectors ?? []).map((s) => s.toLowerCase()),
      business_model: input.business_model ?? null,
      target_markets: input.target_markets ?? [],
      fundraising_target_usd: input.fundraising_target_usd ?? null,
    };
  }
  throw new Error("runInvestorMatching: no profile source provided");
}

export async function runInvestorMatching(
  client: SupabaseClient,
  args: RunMatchingArgs
): Promise<RunMatchingResult> {
  const topK = args.topK ?? DEFAULT_TOP_K;
  const candidateLimit = args.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;

  // ---- Resolve profile -----------------------------------------------------
  let profile: StartupContext;
  if (args.startupProfileId) {
    const { data, error } = await client
      .from("startup_profiles")
      .select(
        "id, startup_name, country, region, stage, sectors, business_model, target_markets, fundraising_target_usd"
      )
      .eq("id", args.startupProfileId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error(`startup_profiles row not found: ${args.startupProfileId}`);
    }
    profile = toStartupContext(data as ProfileRow, null, args.startupProfileId);
  } else if (args.profile) {
    profile = toStartupContext(null, args.profile, null);
  } else {
    throw new Error(
      "runInvestorMatching: either startupProfileId or profile must be provided"
    );
  }

  // ---- Load candidate investor contexts (batched) --------------------------
  const contexts = await loadInvestorContexts(client, null, {
    limit: candidateLimit,
  });

  // ---- Score ---------------------------------------------------------------
  interface Scored {
    ctx: { id: string; investor_name: string; hq_country: string | null; hq_region: string | null };
    breakdown: MatchBreakdown;
  }
  const scored: Scored[] = [];
  for (const ctx of contexts.values()) {
    const breakdown = scoreInvestor(profile, ctx);
    scored.push({
      ctx: {
        id: ctx.id,
        investor_name: ctx.investor_name,
        hq_country: ctx.hq_country,
        hq_region: ctx.hq_region,
      },
      breakdown,
    });
  }

  scored.sort((a, b) => b.breakdown.total - a.breakdown.total);
  const top = scored.slice(0, topK);

  const matches: RankedMatch[] = top.map((s, i) => ({
    investor_id: s.ctx.id,
    investor_name: s.ctx.investor_name,
    hq_country: s.ctx.hq_country,
    hq_region: s.ctx.hq_region,
    rank_position: i + 1,
    breakdown: s.breakdown,
  }));

  // ---- Persist -------------------------------------------------------------
  let saved = 0;
  if (args.persist) {
    const target: RunMatchingWriteTarget | null =
      args.writeTarget ??
      (args.startupProfileId
        ? { kind: "legacy", startupProfileId: args.startupProfileId }
        : null);

    if (target?.kind === "legacy") {
      const del = await client
        .from("investor_matches")
        .delete()
        .eq("startup_profile_id", target.startupProfileId)
        .eq("scoring_version", SCORING_VERSION);
      if (del.error) throw del.error;

      if (matches.length > 0) {
        const rows = matches.map((m) => ({
          startup_profile_id: target.startupProfileId,
          investor_id: m.investor_id,
          score_total: m.breakdown.total,
          score_geo: m.breakdown.geo,
          score_sector: m.breakdown.sector,
          score_stage: m.breakdown.stage,
          score_activity: m.breakdown.activity,
          score_check_size: m.breakdown.check_size,
          reasoning: m.breakdown.reasoning,
          rank_position: m.rank_position,
          scoring_version: SCORING_VERSION,
        }));
        const ins = await client.from("investor_matches").insert(rows);
        if (ins.error) throw ins.error;
        saved = rows.length;
      }
    } else if (target?.kind === "unified") {
      const del = await client
        .from("investor_matches_unified")
        .delete()
        .eq("startup_id", target.startupId)
        .eq("scoring_version", SCORING_VERSION);
      if (del.error) throw del.error;

      if (matches.length > 0) {
        const rows = matches.map((m) => ({
          startup_id: target.startupId,
          investor_id: m.investor_id,
          score_total: m.breakdown.total,
          score_geo: m.breakdown.geo,
          score_sector: m.breakdown.sector,
          score_stage: m.breakdown.stage,
          score_activity: m.breakdown.activity,
          score_check_size: m.breakdown.check_size,
          reasoning: m.breakdown.reasoning,
          rank_position: m.rank_position,
          scoring_version: SCORING_VERSION,
          startup_context_snapshot_json: target.contextSnapshot ?? null,
        }));
        const ins = await client.from("investor_matches_unified").insert(rows);
        if (ins.error) throw ins.error;
        saved = rows.length;
      }
    }
  }

  return { profile, matches, saved };
}
