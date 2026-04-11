/**
 * Investor matching types
 *
 * These types define the data contract for a future VC matching feature.
 * No matching logic is implemented here — this is purely structural.
 *
 * Matching will work by comparing:
 *   InvestorProfile.criteria  ←→  StartupMatchProfile (derived from founder_profiles + tool_saves)
 */

// ─── Shared vocabulary ────────────────────────────────────────────────────────

/** Must stay in sync with onboard.ts sector options */
export type Sector =
  | "SaaS"
  | "Fintech"
  | "Healthtech"
  | "Edtech"
  | "E-commerce"
  | "Marketplace"
  | "DeepTech"
  | "CleanTech"
  | "Gaming"
  | "Other";

/** Must stay in sync with onboard.ts stage options */
export type FundingStage = "Pre-seed" | "Seed" | "Series A" | "Series B+";

export type InvestorType = "VC" | "Angel" | "Family Office" | "Corporate VC" | "Accelerator";

// ─── Investor profile ─────────────────────────────────────────────────────────

export interface InvestorProfile {
  id: string;
  name: string;
  firm: string;
  type: InvestorType;

  /** Geographic focus — ISO country codes or region names */
  geographies: string[];

  /** Matching criteria — what this investor looks for */
  criteria: InvestorCriteria;

  /** Optional: public website or LinkedIn URL */
  url?: string;
}

export interface InvestorCriteria {
  sectors: Sector[];
  stages: FundingStage[];

  /** Minimum readiness score (0–100) before showing this investor */
  minReadinessScore: number;

  /** Minimum monthly revenue in USD, 0 = no requirement */
  minMRR: number;

  /** Minimum annual growth rate %, 0 = no requirement */
  minGrowthRate: number;

  /** Minimum runway in months, 0 = no requirement */
  minRunwayMonths: number;
}

// ─── Startup match profile ────────────────────────────────────────────────────
// Derived at match time from founder_profiles + tool_saves.
// Not stored — computed on demand.

export interface StartupMatchProfile {
  userId: string;
  sector: Sector | string;
  stage: FundingStage | string;

  /** From tool_saves (metrics) */
  mrr: number;
  growthRate: number;
  runwayMonths: number;

  /** From readiness_history */
  overallScore: number;
}

// ─── Match result ─────────────────────────────────────────────────────────────
// Returned by the future matching function.

export interface InvestorMatch {
  investor: InvestorProfile;
  /** 0–100: how well startup fits investor criteria */
  score: number;
  /** Human-readable reasons: "Sector match", "Stage match", etc. */
  reasons: string[];
}
