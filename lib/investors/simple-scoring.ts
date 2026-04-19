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

const SCORE = {
  GEO_FOCUS_HIT: 20,
  HQ_REGION_FALLBACK: 10,
  HQ_COUNTRY_FALLBACK: 10,
  HQ_SECONDARY_SIGNAL: 10,
} as const;

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
// Synonym canonicalization
// ---------------------------------------------------------------------------
// Investors and founders use different vocabularies for the same concept
// ("preseed" vs "pre-seed", "financial services" vs "fintech", "pan-africa"
// vs "africa"). Canonicalize both sides before comparing.
//
// Keys are LOWERCASED input forms (post-`norm`). Values are the canonical
// token we compare against. Extend freely — unmatched inputs pass through.

const STAGE_SYNONYMS: Record<string, string> = {
  "preseed": "pre-seed",
  "pre seed": "pre-seed",
  "pre_seed": "pre-seed",
  "pre-seed": "pre-seed",
  "seed": "seed",
  "seed stage": "seed",
  "series a": "series a",
  "series-a": "series a",
  "series_a": "series a",
  "series b": "series b",
  "series-b": "series b",
  "series_b": "series b",
};

const SECTOR_SYNONYMS: Record<string, string> = {
  "fintech": "fintech",
  "fin tech": "fintech",
  "fin-tech": "fintech",
  "financial services": "fintech",
  "payments": "fintech",
  "banking": "fintech",
  "saas": "saas",
  "software": "saas",
  "b2b software": "saas",
  "b2b saas": "saas",
  "healthtech": "healthtech",
  "health tech": "healthtech",
  "digital health": "healthtech",
  "healthcare tech": "healthtech",
  "healthcare": "healthtech",
};

const GEO_SYNONYMS: Record<string, string> = {
  "africa": "africa",
  "pan africa": "africa",
  "pan-africa": "africa",
  "pan_africa": "africa",
  "mena": "mena",
  "middle east and north africa": "mena",
  "middle east & north africa": "mena",
  "middle east": "mena",
  "north africa": "maghreb",
  "maghreb": "maghreb",
};

function canonical(value: string, map: Record<string, string>): string {
  if (!value) return value;
  return map[value] ?? value;
}

function canonicalArray(values: string[], map: Record<string, string>): string[] {
  return values.map((v) => canonical(v, map));
}

// ---------------------------------------------------------------------------
// Debug instrumentation
// ---------------------------------------------------------------------------
// The route calls `resetSimpleScoringDebug()` at the start of each request;
// `scoreInvestor` then logs a detailed trace for the first N investors of
// that request. Output goes to console.log so it appears in Vercel logs.

let __debugRemaining = 0;
const __DEBUG_DEFAULT = 5;

export function resetSimpleScoringDebug(limit: number = __DEBUG_DEFAULT): void {
  __debugRemaining = Math.max(0, limit | 0);
}

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
): { score: number; reason?: string } {
  const country = canonical(norm(startup.country), GEO_SYNONYMS);
  const region = canonical(norm(startup.region), GEO_SYNONYMS);
  const invGeo = canonicalArray(toArray(investor.geo_focus), GEO_SYNONYMS);
  const hqCountry = canonical(norm(investor.hq_country), GEO_SYNONYMS);
  const hqRegion = canonical(norm(investor.hq_region), GEO_SYNONYMS);

  // Primary: explicit geo_focus when present.
  if (invGeo.length > 0) {
    if (country && anyPartialMatch(invGeo, country)) {
      return { score: SCORE.GEO_FOCUS_HIT, reason: `geo focus: ${country}` };
    }
    if (region && anyPartialMatch(invGeo, region)) {
      return { score: SCORE.GEO_FOCUS_HIT, reason: `geo focus: ${region}` };
    }
    // geo_focus is defined but doesn't match — fall through to HQ as a
    // secondary, reduced-confidence signal.
    if (country && hqCountry && partialMatch(country, hqCountry)) {
      return { score: SCORE.HQ_SECONDARY_SIGNAL, reason: `hq country: ${hqCountry}` };
    }
    if (region && hqRegion && partialMatch(region, hqRegion)) {
      return { score: SCORE.HQ_SECONDARY_SIGNAL, reason: `hq region: ${hqRegion}` };
    }
    return { score: 0 };
  }

  // Fallback: geo_focus is null/empty — HQ is the only geo signal we have.
  // Treat as a weak signal (10), not a strong one (20), to avoid elevating
  // investors whose enrichment is simply missing above investors with a
  // real geo_focus match.
  if (region && hqRegion && partialMatch(region, hqRegion)) {
    return { score: SCORE.HQ_REGION_FALLBACK, reason: `hq region (fallback): ${hqRegion}` };
  }
  if (country && hqCountry && partialMatch(country, hqCountry)) {
    return { score: SCORE.HQ_COUNTRY_FALLBACK, reason: `hq country (fallback): ${hqCountry}` };
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

  // Debug trace — first N investors per request (configured by
  // `resetSimpleScoringDebug()` in the route handler).
  if (__debugRemaining > 0) {
    __debugRemaining -= 1;
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
      reasons,
    });
  }

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
