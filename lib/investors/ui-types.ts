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

// ─── Form <-> StartupContext (v2) conversion ───────────────────────────────

import type { StartupContext } from "./build-startup-context";

function numToStr(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? String(n) : "";
}

function parseNumOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Pre-fill StartupProfileForm values from a built StartupContext. */
export function formValuesFromStartupContext(
  ctx: StartupContext
): StartupProfileFormValues {
  return {
    startup_name: ctx.startup_name ?? "",
    description: ctx.description ?? "",
    country: ctx.country ?? "",
    region: ctx.region ?? "",
    stage: ctx.stage ?? "",
    sectors: ctx.sectors ?? [],
    business_model: "",
    target_markets: [],
    fundraising_target_usd: numToStr(ctx.fundraising.target_raise_usd),
    valuation_estimate: numToStr(ctx.fundraising.valuation_base),
  };
}

/** Convert edited form values back into a StartupContext for the API. */
export function contextFromFormValues(
  v: StartupProfileFormValues
): StartupContext {
  return {
    startup_name: v.startup_name.trim() || null,
    stage: v.stage.trim() || null,
    country: v.country.trim() || null,
    region: v.region.trim() || null,
    sectors: v.sectors.length > 0 ? v.sectors : null,
    description: v.description.trim() || null,
    traction: { mrr: null, growth_mom: null, customers: null },
    fundraising: {
      target_raise_usd: parseNumOrNull(v.fundraising_target_usd),
      valuation_base: parseNumOrNull(v.valuation_estimate),
    },
    readiness_score: null,
  };
}
