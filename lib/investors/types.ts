/**
 * Shared types for the Investor Intelligence matching engine (Phase 2).
 */

export type CanonicalStage =
  | "pre-seed"
  | "seed"
  | "series-a"
  | "growth"
  | "other";

/**
 * Input shape accepted by POST /api/startup-profiles (and runInvestorMatching
 * preview). Mirrors the startup_profiles DB row minus bookkeeping columns.
 */
export interface StartupProfileInput {
  user_id?: string | null;
  startup_name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  stage?: string | null;
  sectors?: string[] | null;
  business_model?: string | null;
  target_markets?: string[] | null;
  revenue_model?: string | null;
  valuation_estimate?: number | null;
  fundraising_target_usd?: number | null;
}

/**
 * Normalized snapshot of a startup profile used by the scoring functions.
 * All string fields are lowercased / trimmed; stage is canonicalized.
 */
export interface StartupContext {
  startup_profile_id?: string | null;
  startup_name: string;
  country: string | null;
  region: string | null;
  stage: CanonicalStage;
  sectors: string[];
  business_model: string | null;
  target_markets: string[];
  fundraising_target_usd: number | null;
}

export interface CountCount {
  country: string;
  count: number;
}
export interface RegionCount {
  region: string;
  count: number;
}
export interface SectorCount {
  sector: string;
  count: number;
}

export interface TypicalCheck {
  median: number;
  p25: number;
  p75: number;
}

/**
 * Per-investor inferred snapshot used by scoring. Combines explicit fields
 * from the investors row with activity-derived aggregates.
 */
export interface InvestorContext {
  id: string;
  investor_name: string;
  hq_country: string | null;
  hq_region: string | null;
  explicit_geo_focus: string[];
  explicit_sector_focus: string[];
  explicit_stage_focus: string[];
  explicit_check_min: number | null;
  explicit_check_max: number | null;
  inferred_countries: CountCount[];
  inferred_regions: RegionCount[];
  inferred_sectors: SectorCount[];
  inferred_stages: Record<CanonicalStage, number>;
  deal_count: number;
  activity_by_year: Record<number, number>;
  activity_score_raw: number;
  typical_check_usd: TypicalCheck | null;
}

export interface MatchBreakdown {
  total: number;
  geo: number;
  sector: number;
  stage: number;
  activity: number;
  check_size: number;
  reasoning: string;
}

export interface RankedMatch {
  investor_id: string;
  investor_name: string;
  hq_country: string | null;
  hq_region: string | null;
  website?: string | null;
  rank_position: number;
  breakdown: MatchBreakdown;
}
