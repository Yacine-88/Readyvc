/**
 * UI-only types for Phase 3 (founder-facing pages).
 * API response shapes are reflected here as narrow structural types so the
 * client can consume them without importing server-side modules.
 */

import type {
  CanonicalStage,
  CountCount,
  MatchBreakdown,
  RegionCount,
  SectorCount,
  TypicalCheck,
} from "./types";

// ─── Investors list ─────────────────────────────────────────────────────────

export interface InvestorListRow {
  id: string;
  investor_name: string;
  normalized_name?: string;
  hq_city: string | null;
  hq_country: string | null;
  hq_region: string | null;
  website: string | null;
  investor_type: string | null;
  deal_count: number;
  activity_score?: number;
}

export interface InvestorsListResponse {
  rows: InvestorListRow[];
  page: number;
  pageSize: number;
  total: number;
}

// ─── Investor detail ────────────────────────────────────────────────────────

export interface InvestorRecord {
  id: string;
  investor_name: string;
  normalized_name?: string | null;
  hq_city: string | null;
  hq_country: string | null;
  hq_region: string | null;
  website: string | null;
  investor_type: string | null;
  explicit_geo_focus?: string[] | null;
  explicit_sector_focus?: string[] | null;
  explicit_stage_focus?: string[] | null;
  explicit_check_min?: number | null;
  explicit_check_max?: number | null;
  source?: string | null;
  description?: string | null;
}

export interface YearlyActivityRow {
  activity_year: number;
  deal_count: number;
  source?: string | null;
}

export interface RecentDealRow {
  deal_id: string;
  role: string | null;
  is_lead: boolean | null;
  deals: {
    id: string;
    company_name: string | null;
    company_country: string | null;
    company_region: string | null;
    sector: string | null;
    round_type: string | null;
    amount_raised_usd: number | null;
    announced_at: string | null;
  };
}

export interface InferredSnapshot {
  countries: CountCount[];
  regions: RegionCount[];
  sectors: SectorCount[];
  stages: Record<CanonicalStage, number>;
  deal_count: number;
  activity_by_year: Record<number, number>;
  activity_score_raw: number;
  typical_check_usd: TypicalCheck | null;
}

export interface InvestorDetailPayload {
  investor: InvestorRecord;
  yearly_activity: YearlyActivityRow[];
  recent_deals: RecentDealRow[];
  inferred: InferredSnapshot | null;
}

// ─── Matches ────────────────────────────────────────────────────────────────

export interface SavedMatchRow {
  id: string;
  startup_profile_id: string;
  investor_id: string;
  score_total: number;
  score_stage: number;
  score_sector: number;
  score_geo: number;
  score_activity: number;
  score_check_size: number;
  reasoning: string | null;
  rank_position: number;
  scoring_version: string;
  created_at: string;
  investors: {
    id: string;
    investor_name: string;
    hq_country: string | null;
    hq_region: string | null;
    website: string | null;
  };
}

export interface MatchListItem {
  rank_position: number;
  investor_id: string;
  investor_name: string;
  hq_country: string | null;
  hq_region: string | null;
  website: string | null;
  breakdown: MatchBreakdown;
}

export function savedMatchToListItem(row: SavedMatchRow): MatchListItem {
  return {
    rank_position: row.rank_position,
    investor_id: row.investor_id,
    investor_name: row.investors?.investor_name ?? "—",
    hq_country: row.investors?.hq_country ?? null,
    hq_region: row.investors?.hq_region ?? null,
    website: row.investors?.website ?? null,
    breakdown: {
      total: row.score_total,
      geo: row.score_geo,
      sector: row.score_sector,
      stage: row.score_stage,
      activity: row.score_activity,
      check_size: row.score_check_size,
      reasoning: row.reasoning ?? "",
    },
  };
}

// ─── Reasoning parser ───────────────────────────────────────────────────────
// simple-run writes reasoning as `[fit_label] r1 | r2 | r3 || warnings: w1, w2`.
// This is the inverse — purely client-side, no schema change.

export type RationaleTone = "positive" | "neutral" | "info" | "warning";

export interface Rationale {
  label: string;
  tone: RationaleTone;
}

export interface ParsedReasoning {
  fit_label: string | null;
  rationales: Rationale[];
  warnings: string[];
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function reasonToRationale(raw: string): Rationale | null {
  const r = raw.trim().toLowerCase();
  if (!r) return null;
  const tail = (k: string) => raw.split(":").slice(1).join(":").trim() || k;

  if (r.startsWith("stage match"))
    return { label: `Stage match: ${titleCase(tail("stage"))}`, tone: "positive" };
  if (r.startsWith("stage adjacent"))
    return { label: `Stage adjacent: ${titleCase(tail("stage"))}`, tone: "neutral" };
  if (r.startsWith("sector match"))
    return { label: `Sector fit: ${titleCase(tail("sector"))}`, tone: "positive" };
  if (r.startsWith("geo exact") || r.startsWith("geo subregion"))
    return { label: `Geo: ${titleCase(tail("match"))}`, tone: "positive" };
  if (r.startsWith("geo regional") || r.startsWith("geo subset"))
    return { label: `Geo: ${titleCase(tail("regional"))}`, tone: "neutral" };
  if (r === "geo global") return { label: "Global investor", tone: "info" };
  if (r.startsWith("hq"))
    return { label: `HQ proximity: ${titleCase(tail("hq"))}`, tone: "neutral" };
  if (r.startsWith("check in range"))
    return { label: "Check size fit", tone: "positive" };
  if (r.startsWith("check near range"))
    return { label: "Check near range", tone: "neutral" };
  if (r.includes("generalist")) return { label: "Generalist investor", tone: "info" };
  if (r.includes("sharp")) return { label: "Sharp profile", tone: "positive" };
  // Fallback: normalize first clause.
  return { label: titleCase(raw.split(":")[0].trim()), tone: "neutral" };
}

export function parseReasoning(raw: string | null | undefined): ParsedReasoning {
  if (!raw) return { fit_label: null, rationales: [], warnings: [] };
  const fitMatch = raw.match(/^\[([^\]]+)\]\s*/);
  const fit_label = fitMatch ? fitMatch[1].trim().toLowerCase() : null;
  const rest = fitMatch ? raw.slice(fitMatch[0].length) : raw;
  const [reasonsPart, warningsPart] = rest.split(/\s*\|\|\s*warnings:\s*/i);
  const reasonTokens = (reasonsPart ?? "")
    .split(/\s*\|\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  const rationales = reasonTokens
    .map(reasonToRationale)
    .filter((x): x is Rationale => x !== null);
  const warnings = (warningsPart ?? "")
    .split(/,\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  return { fit_label, rationales, warnings };
}

export const FIT_LABEL_DISPLAY: Record<string, { text: string; tone: RationaleTone }> = {
  excellent_fit: { text: "Excellent fit", tone: "positive" },
  strong_fit: { text: "Strong fit", tone: "positive" },
  good_fit: { text: "Good fit", tone: "positive" },
  partial_fit: { text: "Partial fit", tone: "neutral" },
  weak_fit: { text: "Weak fit", tone: "warning" },
  // tolerance for alternate casings
  excellent: { text: "Excellent fit", tone: "positive" },
  strong: { text: "Strong fit", tone: "positive" },
  good: { text: "Good fit", tone: "positive" },
  partial: { text: "Partial fit", tone: "neutral" },
  weak: { text: "Weak fit", tone: "warning" },
};

export function fitLabelFromScore(total: number): { text: string; tone: RationaleTone } {
  if (total >= 75) return { text: "Excellent fit", tone: "positive" };
  if (total >= 60) return { text: "Strong fit", tone: "positive" };
  if (total >= 45) return { text: "Good fit", tone: "positive" };
  if (total >= 25) return { text: "Partial fit", tone: "neutral" };
  return { text: "Weak fit", tone: "warning" };
}

// ─── Startup profiles ───────────────────────────────────────────────────────

export interface StartupProfileRecord {
  id: string;
  user_id: string | null;
  startup_name: string;
  description: string | null;
  country: string | null;
  region: string | null;
  stage: string | null;
  sectors: string[] | null;
  business_model: string | null;
  target_markets: string[] | null;
  revenue_model: string | null;
  valuation_estimate: number | null;
  fundraising_target_usd: number | null;
  created_at?: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export type InvestorSort = "activity_desc" | "name_asc" | "deals_desc";

export interface InvestorFilterState {
  search: string;
  region: string;
  country: string;
  sector: string;
  stage: string;
  minActivity: string; // kept as string for URL sync; parsed at submit
  sort: InvestorSort;
  page: number;
  pageSize: number;
}

export const DEFAULT_INVESTOR_FILTERS: InvestorFilterState = {
  search: "",
  region: "",
  country: "",
  sector: "",
  stage: "",
  minActivity: "",
  sort: "activity_desc",
  page: 1,
  pageSize: 25,
};

export type MatchSort = "fit_desc" | "activity_desc" | "name_asc";

export interface MatchFilterState {
  region: string;
  country: string;
  sector: string;
  stage: string;
  sort: MatchSort;
}

export const DEFAULT_MATCH_FILTERS: MatchFilterState = {
  region: "",
  country: "",
  sector: "",
  stage: "",
  sort: "fit_desc",
};

// ─── Startup profile form ──────────────────────────────────────────────────

export interface StartupProfileFormValues {
  startup_name: string;
  description: string;
  country: string;
  region: string;
  stage: string;
  sectors: string[];
  business_model: string;
  target_markets: string[];
  fundraising_target_usd: string;
  valuation_estimate: string;
}

export const EMPTY_STARTUP_PROFILE_FORM: StartupProfileFormValues = {
  startup_name: "",
  description: "",
  country: "",
  region: "",
  stage: "",
  sectors: [],
  business_model: "",
  target_markets: [],
  fundraising_target_usd: "",
  valuation_estimate: "",
};
