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

export interface SimpleInvestor {
  id: string;
  investor_name: string | null;
  hq_country?: string | null;
  hq_region?: string | null;
  geo_focus?: unknown;
  stage_focus?: unknown;
  sector_focus?: unknown;
  check_min_usd?: number | string | null;
  check_max_usd?: number | string | null;
  // Optional enrichment — ignored if absent
  lead_follow_preference?: unknown;
  primary_stage_focus?: unknown;
  can_also_enter_at?: unknown;
  initial_check_size?: unknown;
  large_check_size?: unknown;
  initial_ownership_target?: unknown;
  investment_focus?: unknown;
}

export interface SimpleStartupInput {
  stage?: string | null;
  sectors?: string[] | string | null;
  country?: string | null;
  region?: string | null;
  raise_amount?: number | string | null;
}

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
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function norm(v: unknown): string {
  if (v == null) return "";
  return String(v).toLowerCase().trim();
}

/** Accept arrays, comma-separated strings, or JSON arrays. Always returns lowercased, trimmed, non-empty entries. */
function toArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => norm(x)).filter(Boolean);
  }
  if (typeof v === "string") {
    // Try JSON array first (Supabase jsonb comes back as already-parsed in JS,
    // but some paths deliver raw strings).
    const s = v.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map((x) => norm(x)).filter(Boolean);
      } catch {
        // fall through to comma split
      }
    }
    return s.split(",").map((p) => norm(p)).filter(Boolean);
  }
  // Objects / numbers — ignore
  return [];
}

function partialMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function anyPartialMatch(candidates: string[], needle: string): boolean {
  if (!needle) return false;
  return candidates.some((c) => partialMatch(c, needle));
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Individual match functions
// ---------------------------------------------------------------------------

export function matchStage(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string } {
  const stage = norm(startup.stage);
  if (!stage) return { score: 0 };

  // Prefer stage_focus; fall back to primary_stage_focus / can_also_enter_at if present.
  const explicit = toArray(investor.stage_focus);
  const primary = toArray(investor.primary_stage_focus);
  const also = toArray(investor.can_also_enter_at);

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
  const startupSectors = toArray(startup.sectors);
  const invSectors = toArray(investor.sector_focus);
  const invFocus = toArray(investor.investment_focus);

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
): { score: number; reason?: string } {
  const country = norm(startup.country);
  const region = norm(startup.region);
  const invGeo = toArray(investor.geo_focus);
  const hqCountry = norm(investor.hq_country);
  const hqRegion = norm(investor.hq_region);

  if (country && anyPartialMatch(invGeo, country)) {
    return { score: 20, reason: `geo focus: ${country}` };
  }
  if (region && anyPartialMatch(invGeo, region)) {
    return { score: 20, reason: `geo focus: ${region}` };
  }
  if (country && hqCountry && partialMatch(country, hqCountry)) {
    return { score: 10, reason: `hq country: ${hqCountry}` };
  }
  if (region && hqRegion && partialMatch(region, hqRegion)) {
    return { score: 10, reason: `hq region: ${hqRegion}` };
  }
  return { score: 0 };
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

  return {
    score: Math.round(total * 100) / 100,
    reasons,
    breakdown: {
      stage: stage.score,
      sector: sector.score,
      geo: geo.score,
      check: check.score,
    },
  };
}
