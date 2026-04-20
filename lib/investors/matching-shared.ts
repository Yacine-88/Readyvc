/**
 * Shared primitives for investor-matching engines.
 *
 * Both `simple_v1` (simple-scoring.ts) and `premium_v2` (premium-scoring.ts)
 * import from here. No scoring logic lives in this file — only
 * normalization, canonicalization, and shared types. Keeping these neutral
 * prevents premium from depending on simple, and vice versa.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type GeoMatchType =
  | "exact"
  | "regional"
  | "global"
  | "fallback"
  | "none";

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
  cleanup_note?: string | null;
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

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

export function norm(v: unknown): string {
  if (v == null) return "";
  return String(v).toLowerCase().trim();
}

/** Accept arrays, comma-separated strings, or JSON arrays. Always returns lowercased, trimmed, non-empty entries. */
export function toArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => norm(x)).filter(Boolean);
  }
  if (typeof v === "string") {
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
  return [];
}

export function partialMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function anyPartialMatch(candidates: string[], needle: string): boolean {
  if (!needle) return false;
  return candidates.some((c) => partialMatch(c, needle));
}

export function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Synonym canonicalization
// ---------------------------------------------------------------------------

export const STAGE_SYNONYMS: Record<string, string> = {
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

export const SECTOR_SYNONYMS: Record<string, string> = {
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

export const GEO_SYNONYMS: Record<string, string> = {
  "africa": "africa",
  "pan africa": "africa",
  "pan-africa": "africa",
  "pan_africa": "africa",
  "worldwide": "global",
  "global": "global",
  "mena": "mena",
  "middle east and north africa": "mena",
  "middle east & north africa": "mena",
  "middle east": "middle east",
  "north africa": "north africa",
  "maghreb": "north africa",
  "west africa": "west africa",
  "east africa": "east africa",
  "southern africa": "southern africa",
  "central africa": "central africa",
};

export function canonical(value: string, map: Record<string, string>): string {
  if (!value) return value;
  return map[value] ?? value;
}

export function canonicalArray(
  values: string[],
  map: Record<string, string>
): string[] {
  return values.map((v) => canonical(v, map));
}

// ---------------------------------------------------------------------------
// Geographic hierarchy
// ---------------------------------------------------------------------------

export const GEO_PARENTS: Record<string, string[]> = {
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
  "u.a.e.": ["middle east", "mena"],
  qatar: ["middle east", "mena"],
  bahrain: ["middle east", "mena"],
  oman: ["middle east", "mena"],
  kuwait: ["middle east", "mena"],
  "middle east": ["mena"],
};

export function geoParents(value: string): string[] {
  return GEO_PARENTS[value] ?? [];
}

export function isGlobalToken(v: string): boolean {
  return v === "global" || v === "worldwide";
}
