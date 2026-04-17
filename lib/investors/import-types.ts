/**
 * Shared TypeScript types for the Investor Intelligence ingestion layer.
 * Kept minimal and DB-shape-aligned so the import scripts can pass rows
 * straight to Supabase upserts.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json };

// -- DB row shapes (insert payloads) ---------------------------------------

export interface InvestorInsert {
  investor_name: string;
  normalized_name: string;
  fund_name: string | null;
  investor_type: string | null;
  website: string | null;
  linkedin_url: string | null;
  hq_city: string | null;
  hq_country: string | null;
  hq_region: string | null;
  geo_focus: Json | null;
  stage_focus: Json | null;
  sector_focus: Json | null;
  check_min_usd: number | null;
  check_max_usd: number | null;
  lead_rounds: boolean | null;
  follow_on_only: boolean | null;
  thesis_text: string | null;
  source: string;
  source_url: string | null;
  source_confidence: number | null;
  last_verified_at: string | null;
  import_metadata: Json | null;
}

export interface InvestorActivityInsert {
  investor_id: string;
  activity_year: number;
  deal_count: number;
  source: string;
}

export interface DealInsert {
  deal_external_key: string | null;
  company_name: string;
  normalized_company_name: string;
  company_country: string | null;
  company_region: string | null;
  sector: string | null;
  subsector: string | null;
  business_model: string | null;
  round_type: string | null;
  amount_raised_usd: number | null;
  amount_raised_original: string | null;
  currency: string | null;
  announced_at: string | null;
  source: string;
  import_metadata: Json | null;
}

export interface DealInvestorInsert {
  deal_id: string;
  investor_id: string | null;
  investor_name_raw: string;
  normalized_investor_name_raw: string;
  role: string | null;
  is_lead: boolean | null;
  match_confidence: number | null;
  match_method: string | null;
}

// -- Import run bookkeeping ------------------------------------------------

export type ImportStatus = "running" | "success" | "partial" | "failed";

export interface ImportRunStats {
  rows_read: number;
  rows_skipped: number;
  rows_upserted: number;
  child_rows_upserted?: number;
  exact_matches?: number;
  unmatched?: number;
  [k: string]: number | undefined;
}

export interface ImportRowIssue {
  row_index: number;
  reason: string;
  raw?: Json;
}
