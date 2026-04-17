/**
 * Investor context inference.
 *
 * Given a set of investor ids (or "all investors up to limit"), this module
 * performs AT MOST 3 categories of queries — investors rows, yearly activity,
 * and deal_investors × deals — then aggregates everything in memory into a
 * per-investor `InvestorContext` used by the scoring engine.
 *
 * No N+1: we paginate through large IN lists in chunks and never issue a
 * query per investor.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapRoundTypeToStage,
} from "./stage-mapping";
import { computeActivityScoreRaw } from "./activity";
import type {
  CanonicalStage,
  CountCount,
  InvestorContext,
  RegionCount,
  SectorCount,
  TypicalCheck,
} from "./types";
import { CANONICAL_STAGES } from "./stage-mapping";

const CHUNK = 1000;
const DEFAULT_LIMIT = 2000;

interface InvestorRow {
  id: string;
  investor_name: string;
  hq_country: string | null;
  hq_region: string | null;
  geo_focus: unknown;
  stage_focus: unknown;
  sector_focus: unknown;
  check_min_usd: number | null;
  check_max_usd: number | null;
}

interface ActivityRow {
  investor_id: string;
  activity_year: number;
  deal_count: number;
}

interface DealJoinRow {
  investor_id: string | null;
  deals:
    | {
        company_country: string | null;
        company_region: string | null;
        sector: string | null;
        round_type: string | null;
        amount_raised_usd: number | null;
        announced_at: string | null;
      }
    | null;
}

function asStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((x) => (x as string).trim())
      .filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function emptyStageHistogram(): Record<CanonicalStage, number> {
  const out: Record<CanonicalStage, number> = {
    "pre-seed": 0,
    seed: 0,
    "series-a": 0,
    growth: 0,
    other: 0,
  };
  // Ensures all CANONICAL_STAGES are present.
  for (const s of CANONICAL_STAGES) {
    if (out[s] === undefined) out[s] = 0;
  }
  return out;
}

function topN<T extends { count: number }>(rows: T[], n: number): T[] {
  return [...rows].sort((a, b) => b.count - a.count).slice(0, n);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

function computeTypicalCheck(values: number[]): TypicalCheck | null {
  const clean = values.filter((v) => typeof v === "number" && v > 0 && Number.isFinite(v));
  if (clean.length === 0) return null;
  clean.sort((a, b) => a - b);
  return {
    p25: percentile(clean, 0.25),
    median: percentile(clean, 0.5),
    p75: percentile(clean, 0.75),
  };
}

export interface LoadContextsOptions {
  limit?: number;
  source?: string;
}

export async function loadInvestorContexts(
  client: SupabaseClient,
  investorIds: string[] | null,
  opts: LoadContextsOptions = {}
): Promise<Map<string, InvestorContext>> {
  // ---- 1) investors rows ----------------------------------------------------
  const baseCols =
    "id, investor_name, hq_country, hq_region, geo_focus, stage_focus, sector_focus, check_min_usd, check_max_usd";

  let investorRows: InvestorRow[] = [];

  if (investorIds && investorIds.length === 0) {
    return new Map();
  }

  if (investorIds && investorIds.length > 0) {
    // Chunked IN query.
    for (let i = 0; i < investorIds.length; i += CHUNK) {
      const chunk = investorIds.slice(i, i + CHUNK);
      const { data, error } = await client
        .from("investors")
        .select(baseCols)
        .in("id", chunk);
      if (error) throw error;
      if (data) investorRows.push(...(data as unknown as InvestorRow[]));
    }
  } else {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    let q = client.from("investors").select(baseCols).limit(limit);
    if (opts.source) q = q.eq("source", opts.source);
    const { data, error } = await q;
    if (error) throw error;
    investorRows = (data ?? []) as unknown as InvestorRow[];
  }

  if (investorRows.length === 0) return new Map();

  const ids = investorRows.map((r) => r.id);

  // ---- 2) yearly activity ---------------------------------------------------
  const activityRows: ActivityRow[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await client
      .from("investor_activity_yearly")
      .select("investor_id, activity_year, deal_count")
      .in("investor_id", chunk);
    if (error) throw error;
    if (data) activityRows.push(...(data as unknown as ActivityRow[]));
  }

  // ---- 3) deal_investors × deals -------------------------------------------
  const dealRows: DealJoinRow[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await client
      .from("deal_investors")
      .select(
        "investor_id, deals!inner(company_country, company_region, sector, round_type, amount_raised_usd, announced_at)"
      )
      .in("investor_id", chunk);
    if (error) throw error;
    if (data) dealRows.push(...(data as unknown as DealJoinRow[]));
  }

  // ---- Aggregate in memory --------------------------------------------------
  const out = new Map<string, InvestorContext>();

  for (const row of investorRows) {
    out.set(row.id, {
      id: row.id,
      investor_name: row.investor_name,
      hq_country: row.hq_country,
      hq_region: row.hq_region,
      explicit_geo_focus: asStringArray(row.geo_focus),
      explicit_sector_focus: asStringArray(row.sector_focus),
      explicit_stage_focus: asStringArray(row.stage_focus),
      explicit_check_min: row.check_min_usd,
      explicit_check_max: row.check_max_usd,
      inferred_countries: [],
      inferred_regions: [],
      inferred_sectors: [],
      inferred_stages: emptyStageHistogram(),
      deal_count: 0,
      activity_by_year: {},
      activity_score_raw: 0,
      typical_check_usd: null,
    });
  }

  // Yearly activity
  for (const a of activityRows) {
    const ctx = out.get(a.investor_id);
    if (!ctx) continue;
    ctx.activity_by_year[a.activity_year] =
      (ctx.activity_by_year[a.activity_year] ?? 0) + (a.deal_count ?? 0);
  }

  // Per-investor aggregation buckets for deals
  const countryBuckets = new Map<string, Map<string, number>>();
  const regionBuckets = new Map<string, Map<string, number>>();
  const sectorBuckets = new Map<string, Map<string, number>>();
  const checkBuckets = new Map<string, number[]>();

  function bucket(
    map: Map<string, Map<string, number>>,
    investorId: string,
    key: string
  ) {
    let inner = map.get(investorId);
    if (!inner) {
      inner = new Map();
      map.set(investorId, inner);
    }
    inner.set(key, (inner.get(key) ?? 0) + 1);
  }

  for (const r of dealRows) {
    if (!r.investor_id) continue;
    const ctx = out.get(r.investor_id);
    if (!ctx) continue;
    ctx.deal_count += 1;
    const d = r.deals;
    if (!d) continue;

    if (d.company_country) {
      bucket(countryBuckets, r.investor_id, d.company_country.trim());
    }
    if (d.company_region) {
      bucket(regionBuckets, r.investor_id, d.company_region.trim());
    }
    if (d.sector) {
      bucket(sectorBuckets, r.investor_id, d.sector.trim().toLowerCase());
    }
    const stage = mapRoundTypeToStage(d.round_type);
    ctx.inferred_stages[stage] = (ctx.inferred_stages[stage] ?? 0) + 1;

    if (typeof d.amount_raised_usd === "number" && d.amount_raised_usd > 0) {
      let arr = checkBuckets.get(r.investor_id);
      if (!arr) {
        arr = [];
        checkBuckets.set(r.investor_id, arr);
      }
      arr.push(d.amount_raised_usd);
    }
  }

  // Finalize per-investor aggregates
  for (const ctx of out.values()) {
    const cb = countryBuckets.get(ctx.id);
    if (cb) {
      const rows: CountCount[] = Array.from(cb.entries()).map(([country, count]) => ({
        country,
        count,
      }));
      ctx.inferred_countries = topN(rows, 5);
    }
    const rb = regionBuckets.get(ctx.id);
    if (rb) {
      const rows: RegionCount[] = Array.from(rb.entries()).map(([region, count]) => ({
        region,
        count,
      }));
      ctx.inferred_regions = topN(rows, 5);
    }
    const sb = sectorBuckets.get(ctx.id);
    if (sb) {
      const rows: SectorCount[] = Array.from(sb.entries()).map(([sector, count]) => ({
        sector,
        count,
      }));
      ctx.inferred_sectors = topN(rows, 5);
    }
    const checks = checkBuckets.get(ctx.id);
    ctx.typical_check_usd = computeTypicalCheck(checks ?? []);
    ctx.activity_score_raw = computeActivityScoreRaw(
      ctx.activity_by_year,
      ctx.deal_count
    );
  }

  return out;
}

export async function getInvestorContext(
  client: SupabaseClient,
  investorId: string
): Promise<InvestorContext | null> {
  const map = await loadInvestorContexts(client, [investorId]);
  return map.get(investorId) ?? null;
}
