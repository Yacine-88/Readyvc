/**
 * POST /api/matching/simple-run
 *
 * Parallel implementation (Option A2). Does NOT modify or replace
 * `/api/matching/run` or the existing scoring engine.
 *
 * Request body:
 *   { stage, sectors, country, region, raise_amount }
 *
 * Response:
 *   { ok: true, data: [{ investor_name, score, reasons }] }
 *
 * Persistence:
 *   * Creates an ephemeral `startup_profiles` row (revenue_model sentinel
 *     `__simple_v1_ephemeral__`) to anchor the matches via FK.
 *   * Writes results into legacy `public.investor_matches` with
 *     `scoring_version = 'simple_v1'`. Unique index
 *     `(startup_profile_id, investor_id, scoring_version)` guarantees
 *     no duplicates per run.
 *   * Does NOT write to `investor_matches_unified`.
 *
 * Persistence failures do not fail the response — scoring is still returned.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  scoreInvestor,
  type SimpleInvestor,
  type SimpleStartupInput,
  type GeoMatchType,
} from "@/lib/investors/simple-scoring";
import {
  scoreInvestorPremium,
  premiumCompare,
  type FitLabel,
  type PremiumSortable,
} from "@/lib/investors/premium-scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accept the canonical names AND common aliases emitted by the various
 * callers (zero-friction flow, startup_profiles row, founder UI).
 * The route is intentionally permissive: any alias that resolves to a
 * non-null value wins; canonical names take precedence.
 */
interface SimpleRunBody {
  // which engine to run: "simple_v1" (default) | "premium_v2"
  scoring_version?: string | null;
  // stage
  stage?: string | null;
  startup_stage?: string | null;
  stage_current?: string | null;
  // sectors
  sectors?: string[] | string | null;
  sector?: string[] | string | null;
  sector_focus?: string[] | string | null;
  // country
  country?: string | null;
  startup_country?: string | null;
  hq_country?: string | null;
  // region
  region?: string | null;
  startup_region?: string | null;
  hq_region?: string | null;
  // raise_amount
  raise_amount?: number | string | null;
  target_raise?: number | string | null;
  fundraising_target?: number | string | null;
  fundraising_target_usd?: number | string | null;
  // identity (persisted in ephemeral row so results page shows real data)
  startup_name?: string | null;
  description?: string | null;
  business_model?: string | null;
  target_markets?: string[] | string | null;
  valuation_estimate?: number | string | null;
}

interface ScoredRowSimple {
  version: "simple_v1";
  id: string;
  investor_name: string;
  score: number;
  reasons: string[];
  breakdown: { stage: number; sector: number; geo: number; check: number };
  geo_match_type: GeoMatchType;
}

interface ScoredRowPremium {
  version: "premium_v2";
  id: string;
  investor_name: string;
  score: number;
  reasons: string[];
  warnings: string[];
  breakdown: {
    stage: number;
    sector: number;
    geo: number;
    precision: number;
    penalties: number;
  };
  geo_match_type: GeoMatchType;
  fit_label: FitLabel;
  sector_count: number;
  stage_count: number;
}

type ScoredRow = ScoredRowSimple | ScoredRowPremium;

// Tiebreaker priority when two investors have equal total scores.
// Higher = better. exact > regional > global > fallback > none.
const GEO_TIEBREAK: Record<GeoMatchType, number> = {
  exact: 4,
  regional: 3,
  global: 2,
  fallback: 1,
  none: 0,
};

const SCORING_VERSION_SIMPLE = "simple_v1";
const SCORING_VERSION_PREMIUM = "premium_v2";
const EPHEMERAL_SENTINEL = "__simple_v1_ephemeral__";
const TOP_K_PERSIST = 50;

type ScoringVersion = typeof SCORING_VERSION_SIMPLE | typeof SCORING_VERSION_PREMIUM;

function resolveScoringVersion(raw: string | null | undefined): ScoringVersion {
  if (raw === SCORING_VERSION_PREMIUM) return SCORING_VERSION_PREMIUM;
  return SCORING_VERSION_SIMPLE;
}

export async function POST(request: Request) {
  let body: SimpleRunBody;
  try {
    body = (await request.json()) as SimpleRunBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON" },
      { status: 400 }
    );
  }

  // Alias-tolerant mapping. `firstDefined` returns the first value that is
  // not null/undefined/empty-string, so canonical names still win when
  // present but aliases are picked up when they aren't.
  const firstDefined = <T,>(...vals: (T | null | undefined)[]): T | null => {
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      return v;
    }
    return null;
  };

  const startup: SimpleStartupInput = {
    stage: firstDefined(body.stage, body.startup_stage, body.stage_current),
    sectors: firstDefined<string[] | string>(
      body.sectors,
      body.sector,
      body.sector_focus
    ),
    country: firstDefined(body.country, body.startup_country, body.hq_country),
    region: firstDefined(body.region, body.startup_region, body.hq_region),
    raise_amount: firstDefined<number | string>(
      body.raise_amount,
      body.target_raise,
      body.fundraising_target,
      body.fundraising_target_usd
    ),
  };

  // Debug: compare what arrived vs. what the scorer sees. These logs are
  // how we'll confirm in production that the mapping works end-to-end.
  console.log("[simple-run] STARTUP PROFILE RAW", body);
  console.log("[simple-run] STARTUP INPUT MAPPED", startup);

  const client = getSupabaseAdmin();

  // -------------------------------------------------------------------------
  // Load investors — only the columns the simple engine needs.
  // -------------------------------------------------------------------------
  const { data: investors, error: fetchErr } = await client
    .from("investors")
    .select(
      [
        "id",
        "investor_name",
        "hq_country",
        "hq_region",
        "geo_focus",
        "stage_focus",
        "sector_focus",
        "check_min_usd",
        "check_max_usd",
      ].join(", ")
    );

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, error: `investors query failed: ${fetchErr.message}` },
      { status: 500 }
    );
  }

  const scoringVersion = resolveScoringVersion(body.scoring_version);
  const investorList = ((investors ?? []) as unknown as SimpleInvestor[]);

  let scored: ScoredRow[];

  if (scoringVersion === SCORING_VERSION_PREMIUM) {
    const rows: (PremiumSortable & { id: string })[] = investorList.map((inv) => {
      const r = scoreInvestorPremium(inv, startup);
      return {
        id: inv.id,
        investor_name: inv.investor_name ?? "(unnamed)",
        ...r,
      };
    });
    rows.sort(premiumCompare);
    scored = rows.map<ScoredRowPremium>((r) => ({
      version: "premium_v2",
      id: r.id,
      investor_name: r.investor_name,
      score: r.score,
      reasons: r.reasons,
      warnings: r.warnings,
      breakdown: r.breakdown, // full premium breakdown, no collapse
      geo_match_type: r.geo_match_type,
      fit_label: r.fit_label,
      sector_count: r.sector_count,
      stage_count: r.stage_count,
    }));
  } else {
    scored = investorList
      .map<ScoredRowSimple>((inv) => {
        const s = scoreInvestor(inv, startup);
        return {
          version: "simple_v1",
          id: inv.id,
          investor_name: inv.investor_name ?? "(unnamed)",
          score: s.score,
          reasons: s.reasons,
          breakdown: s.breakdown,
          geo_match_type: s.geo_match_type,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Geo-precision tiebreaker: exact > regional > global > fallback > none.
        return GEO_TIEBREAK[b.geo_match_type] - GEO_TIEBREAK[a.geo_match_type];
      });
  }

  const publicData = scored.map((s) =>
    s.version === "premium_v2"
      ? {
          investor_name: s.investor_name,
          score: s.score,
          reasons: s.reasons,
          warnings: s.warnings,
          breakdown: s.breakdown, // { stage, sector, geo, precision, penalties }
          geo_match_type: s.geo_match_type,
          fit_label: s.fit_label,
        }
      : {
          investor_name: s.investor_name,
          score: s.score,
          reasons: s.reasons,
          breakdown: s.breakdown, // { stage, sector, geo, check }
          geo_match_type: s.geo_match_type,
        }
  );

  // -------------------------------------------------------------------------
  // Persist: ephemeral startup_profiles row + investor_matches rows.
  // Persistence failures are non-fatal; we log and return scoring anyway.
  // -------------------------------------------------------------------------
  let persisted = false;
  let startupProfileId: string | null = null;

  try {
    // Persist what the scorer actually saw (post-alias resolution), not the
    // raw body — so the ephemeral row faithfully reflects the scored input.
    const sectorsJson = Array.isArray(startup.sectors)
      ? startup.sectors
      : typeof startup.sectors === "string" && startup.sectors.trim().length > 0
        ? startup.sectors.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

    const raiseNum =
      typeof startup.raise_amount === "number"
        ? startup.raise_amount
        : startup.raise_amount
          ? Number(startup.raise_amount)
          : null;

    const targetMarketsJson = Array.isArray(body.target_markets)
      ? body.target_markets
      : typeof body.target_markets === "string" && body.target_markets.trim()
        ? body.target_markets.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
    const valuationNum =
      typeof body.valuation_estimate === "number"
        ? body.valuation_estimate
        : body.valuation_estimate
          ? Number(body.valuation_estimate)
          : null;
    const resolvedName =
      (typeof body.startup_name === "string" && body.startup_name.trim()) ||
      `Match run · ${new Date().toLocaleDateString()}`;

    const { data: profileRow, error: profErr } = await client
      .from("startup_profiles")
      .insert({
        startup_name: resolvedName,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description
            : null,
        stage: startup.stage ?? null,
        country: startup.country ?? null,
        region: startup.region ?? null,
        sectors: sectorsJson,
        business_model:
          typeof body.business_model === "string" && body.business_model.trim()
            ? body.business_model
            : null,
        target_markets: targetMarketsJson,
        valuation_estimate:
          valuationNum != null && Number.isFinite(valuationNum) ? valuationNum : null,
        fundraising_target_usd:
          raiseNum != null && Number.isFinite(raiseNum) ? raiseNum : null,
        revenue_model: EPHEMERAL_SENTINEL,
      })
      .select("id")
      .single();

    if (profErr || !profileRow) {
      console.warn(
        "[simple-run] ephemeral startup_profiles insert failed:",
        profErr?.message
      );
    } else {
      startupProfileId = profileRow.id as string;
      const topRows = scored.slice(0, TOP_K_PERSIST);
      if (topRows.length > 0) {
        const rows = topRows.map((s, i) => {
          // DB schema has fixed columns (score_stage/sector/geo/check_size).
          // For premium we keep stage/sector/geo dimensional scores in their
          // slots and reuse score_check_size to carry the bounded modifier
          // (precision + penalties). The full breakdown is still available
          // in the API response — nothing is lost at the app layer.
          const modifier =
            s.version === "premium_v2"
              ? s.breakdown.precision + s.breakdown.penalties
              : s.breakdown.check;
          const reasoning =
            s.version === "premium_v2"
              ? `[${s.fit_label}] ${s.reasons.join(" | ")}${
                  s.warnings.length ? ` || warnings: ${s.warnings.join(", ")}` : ""
                }`
              : s.reasons.join(" | ");
          return {
            startup_profile_id: startupProfileId,
            investor_id: s.id,
            score_total: s.score,
            score_stage: s.breakdown.stage,
            score_sector: s.breakdown.sector,
            score_geo: s.breakdown.geo,
            score_check_size: modifier,
            reasoning,
            rank_position: i + 1,
            scoring_version: scoringVersion,
          };
        });
        const { error: insErr } = await client
          .from("investor_matches")
          .insert(rows);
        if (insErr) {
          console.warn(
            "[simple-run] investor_matches insert failed:",
            insErr.message
          );
        } else {
          persisted = true;
        }
      } else {
        // No scored rows to persist, but the profile row exists — still "ok".
        persisted = true;
      }
    }
  } catch (e) {
    console.warn(
      "[simple-run] persistence threw:",
      e instanceof Error ? e.message : String(e)
    );
  }

  return NextResponse.json({
    ok: true,
    data: publicData,
    persisted,
    startup_profile_id: startupProfileId,
    scoring_version: scoringVersion,
  });
}
