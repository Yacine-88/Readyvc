/**
 * Simple matching engine — parallel implementation (Option A2).
 *
 * Scoring weights (total = 100):
 *   stage       40%
 *   sector      25%
 *   geo         20%
 *   check_size  15%
 *
 * Operates on the REAL `investors` schema columns:
 *   id, investor_name,
 *   hq_country, hq_region,
 *   geo_focus, stage_focus, sector_focus,
 *   check_min_usd, check_max_usd
 *
 * Optional enrichment fields (lead_follow_preference, primary_stage_focus,
 * can_also_enter_at, initial_check_size, large_check_size,
 * initial_ownership_target, investment_focus) are read safely if present
 * and ignored otherwise.
 *
 * All string comparisons are lowercase, trimmed, and partial-includes match.
 * Input fields accept arrays or comma-separated strings. Nulls are handled.
 *
 * This module is intentionally independent from `lib/investors/scoring.ts`
 * and `lib/investors/run-matching.ts` — Option A2 mandates no changes to the
 * existing engine.
 */

// Shared primitives live in matching-shared.ts. We re-export the public
// surface simple_v1 consumers already rely on so callers don't have to care
// where the helper actually lives.
import {
  GEO_PARENTS,
  GEO_SYNONYMS,
  SECTOR_SYNONYMS,
  STAGE_SYNONYMS,
  anyPartialMatch,
  canonical,
  canonicalArray,
  geoParents,
  isGlobalToken as isGlobal,
  norm,
  partialMatch,
  toArray,
  toNumber,
  type GeoMatchType,
  type SimpleInvestor,
  type SimpleStartupInput,
} from "./matching-shared";

export {
  GEO_PARENTS,
  GEO_SYNONYMS,
  SECTOR_SYNONYMS,
  STAGE_SYNONYMS,
  canonical,
  canonicalArray,
  norm,
  partialMatch,
  toArray,
  toNumber,
};
export type { GeoMatchType, SimpleInvestor, SimpleStartupInput };

const SCORE = {
  GEO_EXACT: 20,
  GEO_SUBREGION: 20,         // startup country → investor subregion ("algeria" → "north africa")
  GEO_REGIONAL: 15,          // subregion → region ("north africa" → "africa" / "mena")
  GEO_BROAD: 10,             // generic africa-wide without subregion signal
  GEO_GLOBAL: 5,             // investor declares global / worldwide
  HQ_FALLBACK_MAX: 10,       // geo_focus null → HQ fallback, capped at 10
} as const;

export interface SimpleMatchBreakdown {
  stage: number;
  sector: number;
  geo: number;
  check: number;
}

export interface SimpleMatchResult {
  score: number;
  reasons: string[];
  breakdown: SimpleMatchBreakdown;
  geo_match_type: GeoMatchType;
}

// ---------------------------------------------------------------------------
// Debug instrumentation
// ---------------------------------------------------------------------------
// Logging is UNCONDITIONAL in `scoreInvestor` — every investor scored emits
// a trace line. No counter, no reset, no gating. If log volume becomes a
// concern, reintroduce a limit at the call site (not in the scorer).

// ---------------------------------------------------------------------------
// Individual match functions
// ---------------------------------------------------------------------------

export function matchStage(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string } {
  const stage = canonical(norm(startup.stage), STAGE_SYNONYMS);
  if (!stage) return { score: 0 };

  // Prefer stage_focus; fall back to primary_stage_focus / can_also_enter_at if present.
  const explicit = canonicalArray(toArray(investor.stage_focus), STAGE_SYNONYMS);
  const primary = canonicalArray(toArray(investor.primary_stage_focus), STAGE_SYNONYMS);
  const also = canonicalArray(toArray(investor.can_also_enter_at), STAGE_SYNONYMS);

  if (anyPartialMatch(explicit, stage) || anyPartialMatch(primary, stage)) {
    return { score: 40, reason: `stage match: ${stage}` };
  }
  if (anyPartialMatch(also, stage)) {
    return { score: 20, reason: `stage adjacent: ${stage}` };
  }
  return { score: 0 };
}

export function matchSector(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string } {
  const startupSectors = canonicalArray(toArray(startup.sectors), SECTOR_SYNONYMS);
  const invSectors = canonicalArray(toArray(investor.sector_focus), SECTOR_SYNONYMS);
  const invFocus = canonicalArray(toArray(investor.investment_focus), SECTOR_SYNONYMS);

  if (startupSectors.length === 0 || (invSectors.length === 0 && invFocus.length === 0)) {
    return { score: 0 };
  }

  const pool = [...invSectors, ...invFocus];
  const hits = startupSectors.filter((s) => anyPartialMatch(pool, s));
  if (hits.length === 0) return { score: 0 };

  const ratio = hits.length / startupSectors.length;
  const score = Math.round(25 * ratio * 100) / 100;
  return { score, reason: `sector match: ${hits.join(", ")}` };
}

export function matchGeo(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string; match_type: GeoMatchType } {
  const country = canonical(norm(startup.country), GEO_SYNONYMS);
  const region = canonical(norm(startup.region), GEO_SYNONYMS);
  const invGeo = canonicalArray(toArray(investor.geo_focus), GEO_SYNONYMS);
  const hqCountry = canonical(norm(investor.hq_country), GEO_SYNONYMS);
  const hqRegion = canonical(norm(investor.hq_region), GEO_SYNONYMS);

  // The startup's declared territory, most-specific first.
  const startupTargets = [country, region].filter(Boolean);

  // ---- Path 1: explicit geo_focus present → use ONLY geo_focus. ----
  if (invGeo.length > 0) {
    // 1a. Exact match on startup's own country or region.
    for (const t of startupTargets) {
      if (invGeo.includes(t)) {
        return { score: SCORE.GEO_EXACT, reason: `geo exact: ${t}`, match_type: "exact" };
      }
    }

    // 1b. Investor focus covers a parent of the startup's territory.
    //     e.g. startup country = algeria → invGeo contains "north africa" (20)
    //     or startup region  = north africa → invGeo contains "mena" (15)
    //     or invGeo contains "africa" (broader → 15 if coming from a subregion,
    //     else 10).
    for (const t of startupTargets) {
      const parents = geoParents(t);
      for (const p of parents) {
        if (!invGeo.includes(p)) continue;
        // Immediate subregion hit (e.g. country → subregion).
        if (
          p === "north africa" ||
          p === "west africa" ||
          p === "east africa" ||
          p === "southern africa" ||
          p === "central africa" ||
          p === "middle east"
        ) {
          return { score: SCORE.GEO_SUBREGION, reason: `geo subregion: ${p}`, match_type: "exact" };
        }
        if (p === "mena") {
          return { score: SCORE.GEO_REGIONAL, reason: `geo regional: mena`, match_type: "regional" };
        }
        if (p === "africa") {
          // If the startup itself is a subregion, africa-wide is a regional signal.
          const fromSubregion =
            t === "north africa" ||
            t === "west africa" ||
            t === "east africa" ||
            t === "southern africa" ||
            t === "central africa";
          return {
            score: fromSubregion ? SCORE.GEO_REGIONAL : SCORE.GEO_BROAD,
            reason: `geo regional: africa`,
            match_type: "regional",
          };
        }
      }
    }

    // 1c. Investor focus is a child of the startup's territory.
    //     e.g. startup = africa, invGeo contains "north africa" → partial.
    for (const t of startupTargets) {
      for (const g of invGeo) {
        if (geoParents(g).includes(t)) {
          return {
            score: SCORE.GEO_REGIONAL,
            reason: `geo subset: ${g} ⊂ ${t}`,
            match_type: "regional",
          };
        }
      }
    }

    // 1d. Global investor.
    if (invGeo.some(isGlobal)) {
      return { score: SCORE.GEO_GLOBAL, reason: "geo global", match_type: "global" };
    }

    // geo_focus present but no match → 0. NO HQ secondary fallback.
    return { score: 0, match_type: "none" };
  }

  // ---- Path 2: geo_focus null/empty → HQ fallback, MAX +10. ----
  if (region && hqRegion && partialMatch(region, hqRegion)) {
    return {
      score: SCORE.HQ_FALLBACK_MAX,
      reason: `hq region (fallback): ${hqRegion}`,
      match_type: "fallback",
    };
  }
  if (country && hqCountry && partialMatch(country, hqCountry)) {
    return {
      score: SCORE.HQ_FALLBACK_MAX,
      reason: `hq country (fallback): ${hqCountry}`,
      match_type: "fallback",
    };
  }
  return { score: 0, match_type: "none" };
}

export function matchCheckSize(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string } {
  const amount = toNumber(startup.raise_amount);
  if (amount == null || amount <= 0) return { score: 0 };

  const min = toNumber(investor.check_min_usd);
  const max = toNumber(investor.check_max_usd);

  // Fallback: optional enrichment
  const initial = toNumber(investor.initial_check_size);
  const large = toNumber(investor.large_check_size);

  const lo = min ?? initial ?? null;
  const hi = max ?? large ?? null;

  if (lo == null && hi == null) return { score: 0 };

  const effLo = lo ?? 0;
  const effHi = hi ?? Number.POSITIVE_INFINITY;

  if (amount >= effLo && amount <= effHi) {
    return { score: 15, reason: `check in range` };
  }

  // Within 2x of either bound → partial
  const nearLo = lo != null && amount >= lo * 0.5 && amount <= lo * 2;
  const nearHi = hi != null && amount >= hi * 0.5 && amount <= hi * 2;
  if (nearLo || nearHi) {
    return { score: 7.5, reason: `check near range` };
  }
  return { score: 0 };
}

// ---------------------------------------------------------------------------
// Top-level scorer
// ---------------------------------------------------------------------------

export function scoreInvestor(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): SimpleMatchResult {
  const stage = matchStage(investor, startup);
  const sector = matchSector(investor, startup);
  const geo = matchGeo(investor, startup);
  const check = matchCheckSize(investor, startup);

  const total = stage.score + sector.score + geo.score + check.score;
  const reasons = [stage.reason, sector.reason, geo.reason, check.reason].filter(
    (r): r is string => !!r
  );

  // Unconditional trace for every investor scored.
  console.log("[simple-scoring] trace", {
    startup: {
      stage: startup.stage,
      sectors: startup.sectors,
      country: startup.country,
      region: startup.region,
      raise_amount: startup.raise_amount,
    },
    investor: {
      investor_name: investor.investor_name,
      stage_focus: investor.stage_focus,
      sector_focus: investor.sector_focus,
      geo_focus: investor.geo_focus,
      hq_country: investor.hq_country,
      hq_region: investor.hq_region,
      check_min_usd: investor.check_min_usd,
      check_max_usd: investor.check_max_usd,
    },
    breakdown: {
      stage: stage.score,
      sector: sector.score,
      geo: geo.score,
      check: check.score,
    },
    geo_match_type: geo.match_type,
    reasons,
  });

  return {
    score: Math.round(total * 100) / 100,
    reasons,
    breakdown: {
      stage: stage.score,
      sector: sector.score,
      geo: geo.score,
      check: check.score,
    },
    geo_match_type: geo.match_type,
  };
}
