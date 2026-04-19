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
  GEO_EXACT: 20,
  GEO_SUBREGION: 20,         // startup country → investor subregion ("algeria" → "north africa")
  GEO_REGIONAL: 15,          // subregion → region ("north africa" → "africa" / "mena")
  GEO_BROAD: 10,             // generic africa-wide without subregion signal
  GEO_GLOBAL: 5,             // investor declares global / worldwide
  HQ_FALLBACK_MAX: 10,       // geo_focus null → HQ fallback, capped at 10
} as const;

export type GeoMatchType =
  | "exact"
  | "regional"
  | "global"
  | "fallback"
  | "none";

// Geographic hierarchy. Keys are canonical geo tokens; values are the
// parent regions they belong to (ordered: nearest → broadest).
// Used so a startup in "algeria" can match an investor focused on
// "north africa" / "africa" / "mena", etc.
const GEO_PARENTS: Record<string, string[]> = {
  algeria: ["north africa", "africa", "mena"],
  morocco: ["north africa", "africa", "mena"],
  tunisia: ["north africa", "africa", "mena"],
  egypt: ["north africa", "africa", "mena"],
  libya: ["north africa", "africa", "mena"],
  "north africa": ["africa", "mena"],
  "west africa": ["africa"],
  "east africa": ["africa"],
  "southern africa": ["africa"],
  "central africa": ["africa"],
  nigeria: ["west africa", "africa"],
  ghana: ["west africa", "africa"],
  senegal: ["west africa", "africa"],
  "cote d'ivoire": ["west africa", "africa"],
  "ivory coast": ["west africa", "africa"],
  kenya: ["east africa", "africa"],
  tanzania: ["east africa", "africa"],
  uganda: ["east africa", "africa"],
  ethiopia: ["east africa", "africa"],
  rwanda: ["east africa", "africa"],
  "south africa": ["southern africa", "africa"],
  zimbabwe: ["southern africa", "africa"],
  botswana: ["southern africa", "africa"],
  namibia: ["southern africa", "africa"],
  "saudi arabia": ["middle east", "mena"],
  uae: ["middle east", "mena"],
  qatar: ["middle east", "mena"],
  bahrain: ["middle east", "mena"],
  oman: ["middle east", "mena"],
  kuwait: ["middle east", "mena"],
  "middle east": ["mena"],
  // North America / Europe
  usa: ["north america"],
  canada: ["north america"],
  mexico: ["north america", "latin america"],
  uk: ["europe"],
  france: ["europe"],
  germany: ["europe"],
  italy: ["europe"],
  spain: ["europe"],
  netherlands: ["europe"],
  switzerland: ["europe"],
};

function geoParents(value: string): string[] {
  return GEO_PARENTS[value] ?? [];
}

function isGlobal(v: string): boolean {
  return v === "global" || v === "worldwide";
}

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
  geo_match_type: GeoMatchType;
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
  // Africa-wide
  "africa": "africa",
  "pan africa": "africa",
  "pan-africa": "africa",
  "pan_africa": "africa",
  // Global
  "worldwide": "global",
  "global": "global",
  // MENA
  "mena": "mena",
  "middle east and north africa": "mena",
  "middle east & north africa": "mena",
  // Middle East (distinct canonical from MENA)
  "middle east": "middle east",
  "middle-east": "middle east",
  "middle_east": "middle east",
  // North Africa + aliases
  "north africa": "north africa",
  "northern africa": "north africa",
  "maghreb": "north africa",
  // West / East / Southern / Central Africa + "-ern" aliases
  "west africa": "west africa",
  "western africa": "west africa",
  "east africa": "east africa",
  "eastern africa": "east africa",
  "southern africa": "southern africa",
  "central africa": "central africa",
  // Common country-code shorthands seen in imported data
  "u.s.": "usa",
  "u.s.a.": "usa",
  "us": "usa",
  "united states": "usa",
  "united states of america": "usa",
  "usa": "usa",
  "u.k.": "uk",
  "united kingdom": "uk",
  "uk": "uk",
  "u.a.e.": "uae",
  "united arab emirates": "uae",
  "uae": "uae",
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
