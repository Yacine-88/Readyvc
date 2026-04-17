/**
 * Pure scoring functions for the matching engine.
 *
 * No DB access, no I/O, no side effects. Every function is input→number in
 * [0,1]; combiners weighted-sum into a single score in [0,1]. Neutral scores
 * (0.3–0.5) are returned where data is missing to avoid punishing investors
 * we simply don't know enough about.
 */

import type {
  CanonicalStage,
  InvestorContext,
  MatchBreakdown,
  StartupContext,
} from "./types";
import { buildReasoning } from "./reasoning";
import { WEIGHTS } from "./scoring-weights";

export { WEIGHTS };

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function eqLoose(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function includesLoose(arr: string[], target: string | null | undefined): boolean {
  if (!target) return false;
  const t = target.trim().toLowerCase();
  return arr.some((x) => x.trim().toLowerCase() === t);
}

// ---------- Geo ------------------------------------------------------------

export function computeGeoScore(
  startup: StartupContext,
  ctx: InvestorContext
): number {
  const country = startup.country;
  const region = startup.region;

  const hasAnyGeoSignal =
    ctx.explicit_geo_focus.length > 0 ||
    !!ctx.hq_country ||
    !!ctx.hq_region ||
    ctx.inferred_countries.length > 0 ||
    ctx.inferred_regions.length > 0;

  if (!hasAnyGeoSignal || (!country && !region)) return 0.4;

  let score = 0;

  // Explicit geo_focus match
  if (country && includesLoose(ctx.explicit_geo_focus, country)) score = Math.max(score, 0.95);
  if (region && includesLoose(ctx.explicit_geo_focus, region)) score = Math.max(score, 0.8);

  // HQ alignment
  if (country && eqLoose(ctx.hq_country, country)) score = Math.max(score, 0.8);
  if (region && eqLoose(ctx.hq_region, region)) score = Math.max(score, 0.6);

  // Inferred countries (weighted by prominence)
  if (country) {
    const total = ctx.inferred_countries.reduce((s, r) => s + r.count, 0);
    const hit = ctx.inferred_countries.find((r) => eqLoose(r.country, country));
    if (hit) {
      const share = total > 0 ? hit.count / total : 0;
      score = Math.max(score, 0.6 + Math.min(0.35, share * 0.5));
    }
  }

  // Inferred regions
  if (region) {
    const total = ctx.inferred_regions.reduce((s, r) => s + r.count, 0);
    const hit = ctx.inferred_regions.find((r) => eqLoose(r.region, region));
    if (hit) {
      const share = total > 0 ? hit.count / total : 0;
      score = Math.max(score, 0.5 + Math.min(0.3, share * 0.4));
    }
  }

  // Weak signal floor if we have some data but no direct hit
  if (score === 0) score = 0.3;

  return clamp01(score);
}

// ---------- Sector ---------------------------------------------------------

export function computeSectorScore(
  startup: StartupContext,
  ctx: InvestorContext
): number {
  const startupSectors = startup.sectors.map((s) => s.toLowerCase());
  if (startupSectors.length === 0) return 0.3;

  const pool = new Set<string>();
  for (const s of ctx.explicit_sector_focus) pool.add(s.toLowerCase());
  for (const s of ctx.inferred_sectors) pool.add(s.sector.toLowerCase());

  if (pool.size === 0) return 0.3;

  let overlap = 0;
  for (const s of startupSectors) {
    if (pool.has(s)) overlap += 1;
  }

  if (overlap === 0) return 0.2;

  const raw = overlap / startupSectors.length;
  // Soft floor so even 1-of-many matches scores above neutral
  return clamp01(Math.max(0.5, raw));
}

// ---------- Stage ----------------------------------------------------------

export function computeStageScore(
  startup: StartupContext,
  ctx: InvestorContext
): number {
  if (startup.stage === "other") return 0.5;

  const hist = ctx.inferred_stages;
  const total =
    hist["pre-seed"] +
    hist["seed"] +
    hist["series-a"] +
    hist["growth"] +
    hist["other"];

  const hasExplicit = ctx.explicit_stage_focus.length > 0;

  if (total === 0 && !hasExplicit) return 0.5;

  let score = 0;

  if (hasExplicit) {
    const want = startup.stage.replace("-", " ");
    const hit = ctx.explicit_stage_focus.some((s) => {
      const n = s.toLowerCase().trim();
      return n === startup.stage || n === want || n.includes(want);
    });
    if (hit) score = Math.max(score, 0.9);
  }

  if (total > 0) {
    const count = hist[startup.stage as CanonicalStage] ?? 0;
    const share = count / total;
    let s = Math.min(1, share * 2);

    // Modal-stage bonus
    let modalStage: CanonicalStage = "other";
    let modalCount = -1;
    (Object.entries(hist) as [CanonicalStage, number][]).forEach(([k, v]) => {
      if (v > modalCount) {
        modalCount = v;
        modalStage = k;
      }
    });
    if ((modalStage as CanonicalStage) === (startup.stage as CanonicalStage) && count > 0) {
      s = Math.min(1, s + 0.1);
    }

    score = Math.max(score, s);
  }

  if (score === 0) score = 0.3;
  return clamp01(score);
}

// ---------- Activity -------------------------------------------------------

export function computeActivityScore(ctx: InvestorContext): number {
  return clamp01(ctx.activity_score_raw);
}

// ---------- Check size -----------------------------------------------------

export function computeCheckSizeScore(
  startup: StartupContext,
  ctx: InvestorContext
): number {
  const target = startup.fundraising_target_usd;
  if (target == null || target <= 0) return 0.5;

  const minE = ctx.explicit_check_min;
  const maxE = ctx.explicit_check_max;

  if (minE != null || maxE != null) {
    const lo = minE ?? 0;
    const hi = maxE ?? Number.POSITIVE_INFINITY;
    if (target >= lo && target <= hi) return 1.0;
    // Slightly outside: within 2x on either side
    const nearLo = lo > 0 && target >= lo / 2 && target < lo;
    const nearHi = Number.isFinite(hi) && target > hi && target <= hi * 2;
    if (nearLo || nearHi) return 0.7;
    return 0.3;
  }

  const typ = ctx.typical_check_usd;
  if (typ) {
    if (target >= typ.p25 && target <= typ.p75) return 0.9;
    const spread = Math.max(1, typ.p75 - typ.p25);
    const lo = typ.p25 - spread;
    const hi = typ.p75 + spread;
    if (target >= lo && target <= hi) return 0.7;
    return 0.4;
  }

  return 0.5;
}

// ---------- Combine --------------------------------------------------------

export interface PartialBreakdown {
  geo: number;
  sector: number;
  stage: number;
  activity: number;
  check_size: number;
}

export function computeTotal(b: PartialBreakdown): number {
  const total =
    b.geo * WEIGHTS.geo +
    b.sector * WEIGHTS.sector +
    b.stage * WEIGHTS.stage +
    b.activity * WEIGHTS.activity +
    b.check_size * WEIGHTS.check_size;
  return clamp01(total);
}

export function scoreInvestor(
  startup: StartupContext,
  ctx: InvestorContext
): MatchBreakdown {
  const geo = clamp01(computeGeoScore(startup, ctx));
  const sector = clamp01(computeSectorScore(startup, ctx));
  const stage = clamp01(computeStageScore(startup, ctx));
  const activity = clamp01(computeActivityScore(ctx));
  const check_size = clamp01(computeCheckSizeScore(startup, ctx));
  const total = computeTotal({ geo, sector, stage, activity, check_size });

  const reasoning = buildReasoning(startup, ctx, {
    geo,
    sector,
    stage,
    activity,
    check_size,
  });

  return {
    total: round4(total),
    geo: round4(geo),
    sector: round4(sector),
    stage: round4(stage),
    activity: round4(activity),
    check_size: round4(check_size),
    reasoning,
  };
}
