/**
 * Premium matching engine — premium_v2.
 *
 * Parallel to simple_v1. simple_v1 remains untouched.
 *
 * Scoring (max 100):
 *   stage         35
 *   sector        25
 *   geo           25
 *   precision     +10 / −10
 *   penalties     −5 per weak-fit signal (capped at −15)
 *
 * Additive layers on top of simple_v1 helpers (canonical, toArray, matchGeo
 * via GEO_PARENTS). We rescale the geo tiers from simple_v1 but reuse the
 * same GeoMatchType classification, so tiebreak semantics line up.
 */

import {
  GEO_SYNONYMS,
  SECTOR_SYNONYMS,
  STAGE_SYNONYMS,
  canonical,
  canonicalArray,
  geoParents,
  isGlobalToken,
  norm,
  partialMatch,
  toArray,
  type GeoMatchType,
  type SimpleInvestor,
  type SimpleStartupInput,
} from "./matching-shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREMIUM_SCORE = {
  STAGE_EXACT: 35,
  STAGE_ADJACENT: 18,
  STAGE_DISTANT: 5,

  SECTOR_FOCUSED: 25, // exact hit, investor 1-3 sectors
  SECTOR_MODERATE: 18, // exact hit, investor 4-6 sectors
  SECTOR_BROAD: 12, // exact hit, investor ≥7 sectors or generalist tag
  SECTOR_GENERALIST_FALLBACK: 8, // no exact hit, but investor is generalist

  GEO_EXACT: 25,
  GEO_SUBREGION: 25,
  GEO_REGIONAL: 18,
  GEO_BROAD: 12,
  GEO_GLOBAL: 6,
  GEO_HQ_FALLBACK: 5,

  PRECISION_MAX: 10,
  PRECISION_MIN: -10,
  PENALTY_UNIT: 5,
  PENALTY_CAP: 15,
} as const;

// Stage ladder — ordered; adjacency uses absolute index delta.
const STAGE_LADDER = [
  "pre-seed",
  "seed",
  "series a",
  "series b",
  "series c",
  "growth",
] as const;
type StageToken = (typeof STAGE_LADDER)[number];

const STAGE_INDEX: Record<string, number> = STAGE_LADDER.reduce(
  (acc, s, i) => {
    acc[s] = i;
    return acc;
  },
  {} as Record<string, number>
);

const EARLY_STAGES = new Set<StageToken>(["pre-seed", "seed"]);
const GROWTH_STAGES = new Set<StageToken>(["series c", "growth"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FitLabel =
  | "excellent_fit"
  | "strong_fit"
  | "good_fit"
  | "partial_fit"
  | "weak_fit";

export interface PremiumBreakdown {
  stage: number;
  sector: number;
  geo: number;
  precision: number;
  penalties: number;
}

export interface PremiumMatchResult {
  score: number;
  reasons: string[];
  warnings: string[];
  breakdown: PremiumBreakdown;
  geo_match_type: GeoMatchType;
  fit_label: FitLabel;
  // sharpness metrics used for deterministic tiebreak
  sector_count: number;
  stage_count: number;
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

function resolveStageToken(raw: string): StageToken | null {
  const c = canonical(raw, STAGE_SYNONYMS);
  return (c in STAGE_INDEX ? (c as StageToken) : null);
}

function matchStagePremium(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): { score: number; reason?: string; warning?: string; hardMiss: boolean; stageCount: number } {
  const startupStage = resolveStageToken(norm(startup.stage));
  const invStages = canonicalArray(toArray(investor.stage_focus), STAGE_SYNONYMS)
    .map(resolveStageToken)
    .filter((s): s is StageToken => s !== null);

  const stageCount = invStages.length;

  if (!startupStage) {
    return { score: 0, hardMiss: false, stageCount };
  }
  if (invStages.length === 0) {
    return { score: 0, warning: "no stage evidence", hardMiss: false, stageCount };
  }

  const startupIdx = STAGE_INDEX[startupStage];
  let bestDelta = Infinity;
  let bestStage: StageToken = invStages[0];
  for (const s of invStages) {
    const d = Math.abs(STAGE_INDEX[s] - startupIdx);
    if (d < bestDelta) {
      bestDelta = d;
      bestStage = s;
    }
  }

  // Hard miss: early-stage startup, investor is pure growth/late.
  const investorIsLateOnly = invStages.every((s) => GROWTH_STAGES.has(s));
  if (EARLY_STAGES.has(startupStage) && investorIsLateOnly) {
    return {
      score: 0,
      warning: "stage mismatch: late-stage investor vs early-stage startup",
      hardMiss: true,
      stageCount,
    };
  }

  if (bestDelta === 0) {
    return {
      score: PREMIUM_SCORE.STAGE_EXACT,
      reason: `stage exact: ${startupStage}`,
      hardMiss: false,
      stageCount,
    };
  }
  if (bestDelta === 1) {
    return {
      score: PREMIUM_SCORE.STAGE_ADJACENT,
      reason: `stage adjacent: ${bestStage} ↔ ${startupStage}`,
      hardMiss: false,
      stageCount,
    };
  }
  if (bestDelta === 2) {
    return {
      score: PREMIUM_SCORE.STAGE_DISTANT,
      reason: `stage distant: ${bestStage}`,
      hardMiss: false,
      stageCount,
    };
  }
  return { score: 0, hardMiss: false, stageCount };
}

// ---------------------------------------------------------------------------
// Sector
// ---------------------------------------------------------------------------

function isGeneralistMark(invSectors: string[], cleanupNote: string): boolean {
  if (invSectors.includes("generalist")) return true;
  const note = cleanupNote.toLowerCase();
  return note.includes("generalist");
}

function matchSectorPremium(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): {
  score: number;
  reason?: string;
  warning?: string;
  sectorCount: number;
} {
  const startupSectors = canonicalArray(toArray(startup.sectors), SECTOR_SYNONYMS);
  const invSectorsRaw = canonicalArray(toArray(investor.sector_focus), SECTOR_SYNONYMS);
  const cleanupNote =
    typeof investor.cleanup_note === "string" ? investor.cleanup_note : "";

  const sectorCount = invSectorsRaw.length;
  const generalist = isGeneralistMark(invSectorsRaw, cleanupNote);

  if (startupSectors.length === 0 || (invSectorsRaw.length === 0 && !generalist)) {
    return { score: 0, sectorCount };
  }

  const hits = startupSectors.filter((s) =>
    invSectorsRaw.some((inv) => partialMatch(inv, s))
  );

  if (hits.length > 0) {
    // Scale tier by investor breadth.
    const focusSize = invSectorsRaw.filter((s) => s !== "generalist").length;
    if (focusSize === 0 || generalist) {
      return {
        score: PREMIUM_SCORE.SECTOR_BROAD,
        reason: `sector match (broad): ${hits.join(", ")}`,
        warning: "sector fit inferred from generalist profile",
        sectorCount,
      };
    }
    if (focusSize <= 3) {
      return {
        score: PREMIUM_SCORE.SECTOR_FOCUSED,
        reason: `sector focused: ${hits.join(", ")}`,
        sectorCount,
      };
    }
    if (focusSize <= 6) {
      return {
        score: PREMIUM_SCORE.SECTOR_MODERATE,
        reason: `sector moderate: ${hits.join(", ")}`,
        sectorCount,
      };
    }
    return {
      score: PREMIUM_SCORE.SECTOR_BROAD,
      reason: `sector broad: ${hits.join(", ")}`,
      warning: "investor covers many sectors",
      sectorCount,
    };
  }

  // No exact hit — allow generalist fallback.
  if (generalist) {
    return {
      score: PREMIUM_SCORE.SECTOR_GENERALIST_FALLBACK,
      reason: "sector generalist fallback",
      warning: "sector fit inferred from generalist profile",
      sectorCount,
    };
  }
  return { score: 0, sectorCount };
}

// ---------------------------------------------------------------------------
// Geo
// ---------------------------------------------------------------------------

function matchGeoPremium(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): {
  score: number;
  reason?: string;
  warning?: string;
  match_type: GeoMatchType;
  geoCount: number;
} {
  const country = canonical(norm(startup.country), GEO_SYNONYMS);
  const region = canonical(norm(startup.region), GEO_SYNONYMS);
  const invGeo = canonicalArray(toArray(investor.geo_focus), GEO_SYNONYMS);
  const hqCountry = canonical(norm(investor.hq_country), GEO_SYNONYMS);
  const hqRegion = canonical(norm(investor.hq_region), GEO_SYNONYMS);
  const geoCount = invGeo.length;

  const targets = [country, region].filter(Boolean);

  if (invGeo.length > 0) {
    // Exact on startup's own country/region.
    for (const t of targets) {
      if (invGeo.includes(t)) {
        return {
          score: PREMIUM_SCORE.GEO_EXACT,
          reason: `geo exact: ${t}`,
          match_type: "exact",
          geoCount,
        };
      }
    }
    // Parent coverage.
    for (const t of targets) {
      for (const p of geoParents(t)) {
        if (!invGeo.includes(p)) continue;
        if (
          p === "north africa" ||
          p === "west africa" ||
          p === "east africa" ||
          p === "southern africa" ||
          p === "central africa" ||
          p === "middle east"
        ) {
          return {
            score: PREMIUM_SCORE.GEO_SUBREGION,
            reason: `geo subregion: ${p}`,
            match_type: "exact",
            geoCount,
          };
        }
        if (p === "mena") {
          return {
            score: PREMIUM_SCORE.GEO_REGIONAL,
            reason: "geo regional: mena",
            match_type: "regional",
            geoCount,
          };
        }
        if (p === "africa") {
          const fromSub =
            t === "north africa" ||
            t === "west africa" ||
            t === "east africa" ||
            t === "southern africa" ||
            t === "central africa";
          return {
            score: fromSub ? PREMIUM_SCORE.GEO_REGIONAL : PREMIUM_SCORE.GEO_BROAD,
            reason: "geo regional: africa",
            match_type: "regional",
            geoCount,
          };
        }
      }
    }
    // Child of startup territory.
    for (const t of targets) {
      for (const g of invGeo) {
        if (geoParents(g).includes(t)) {
          return {
            score: PREMIUM_SCORE.GEO_REGIONAL,
            reason: `geo subset: ${g} ⊂ ${t}`,
            match_type: "regional",
            geoCount,
          };
        }
      }
    }
    // Global.
    if (invGeo.some(isGlobalToken)) {
      return {
        score: PREMIUM_SCORE.GEO_GLOBAL,
        reason: "geo global",
        warning: "geo fit is only global",
        match_type: "global",
        geoCount,
      };
    }
    return { score: 0, match_type: "none", geoCount };
  }

  // HQ fallback.
  if (region && hqRegion && partialMatch(region, hqRegion)) {
    return {
      score: PREMIUM_SCORE.GEO_HQ_FALLBACK,
      reason: `hq region (fallback): ${hqRegion}`,
      warning: "geo inferred from investor HQ",
      match_type: "fallback",
      geoCount,
    };
  }
  if (country && hqCountry && partialMatch(country, hqCountry)) {
    return {
      score: PREMIUM_SCORE.GEO_HQ_FALLBACK,
      reason: `hq country (fallback): ${hqCountry}`,
      warning: "geo inferred from investor HQ",
      match_type: "fallback",
      geoCount,
    };
  }
  return { score: 0, match_type: "none", geoCount };
}

// ---------------------------------------------------------------------------
// Precision / penalties
// ---------------------------------------------------------------------------

function precisionModifier(
  stageCount: number,
  sectorCount: number,
  geoCount: number,
  cleanupNote: string
): { score: number; reason?: string; warning?: string } {
  // Continuous sharpness ramp. Replaces the old binary +10/0 cliff so
  // investors spread smoothly instead of clustering at the same integer sum.
  // Each dimension contributes a factor in [0, 1]:
  //   stage:   1 @ count 1, 0 @ count ≥ 3
  //   sector:  1 @ count 1, 0 @ count ≥ 5
  //   geo:     1 @ count 1, 0 @ count ≥ 3
  if (stageCount > 0 && sectorCount > 0 && geoCount > 0) {
    const stageF = Math.max(0, (3 - stageCount) / 2);
    const sectorF = Math.max(0, (5 - sectorCount) / 4);
    const geoF = Math.max(0, (3 - geoCount) / 2);
    const raw = ((stageF + sectorF + geoF) / 3) * PREMIUM_SCORE.PRECISION_MAX;
    const bonus = Math.round(raw * 10) / 10;
    if (bonus >= 0.5) {
      return {
        score: bonus,
        reason: bonus >= 7 ? "sharp investor profile" : "focused investor profile",
      };
    }
  }

  // Broadness penalty.
  let penalty = 0;
  const reasons: string[] = [];
  if (stageCount >= 5) {
    penalty += 3;
    reasons.push("many stages");
  }
  if (sectorCount >= 7) {
    penalty += 4;
    reasons.push("many sectors");
  }
  if (geoCount >= 5) {
    penalty += 3;
    reasons.push("many geos");
  }
  const genericNote =
    /generalist|source-normalized|insufficient/i.test(cleanupNote || "");
  if (genericNote && stageCount >= 4 && sectorCount >= 5) {
    penalty += 3;
    reasons.push("generic cleanup_note");
  }
  if (penalty === 0) return { score: 0 };
  const clamped = Math.max(PREMIUM_SCORE.PRECISION_MIN, -penalty);
  return {
    score: clamped,
    warning: `broad generalist investor (${reasons.join(", ")})`,
  };
}

function weakFitPenalties(parts: {
  stageScore: number;
  sectorScore: number;
  geoScore: number;
  geoMatchType: GeoMatchType;
  stageCount: number;
  sectorCount: number;
  geoCount: number;
  invGeo: string[];
}): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let penalty = 0;

  const hasStage = parts.stageScore > 0;
  const hasSector = parts.sectorScore > 0;
  const hasGeo = parts.geoScore > 0;

  // No stage evidence at all on investor side.
  if (parts.stageCount === 0) {
    penalty += PREMIUM_SCORE.PENALTY_UNIT;
    warnings.push("no stage evidence");
  }
  // No geo fit and investor is not global.
  if (
    !hasGeo &&
    !parts.invGeo.some(isGlobalToken)
  ) {
    penalty += PREMIUM_SCORE.PENALTY_UNIT;
    warnings.push("no geo fit");
  }
  // Only one dimension matching out of stage/sector/geo.
  const hits = [hasStage, hasSector, hasGeo].filter(Boolean).length;
  if (hits <= 1) {
    penalty += PREMIUM_SCORE.PENALTY_UNIT;
    warnings.push("only one dimension matched");
  }

  return {
    score: -Math.min(penalty, PREMIUM_SCORE.PENALTY_CAP),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Fit label
// ---------------------------------------------------------------------------

function fitLabelFor(score: number): FitLabel {
  if (score >= 75) return "excellent_fit";
  if (score >= 60) return "strong_fit";
  if (score >= 45) return "good_fit";
  if (score >= 25) return "partial_fit";
  return "weak_fit";
}

// ---------------------------------------------------------------------------
// Top-level scorer
// ---------------------------------------------------------------------------

export function scoreInvestorPremium(
  investor: SimpleInvestor,
  startup: SimpleStartupInput
): PremiumMatchResult {
  const stage = matchStagePremium(investor, startup);
  const sector = matchSectorPremium(investor, startup);
  const geo = matchGeoPremium(investor, startup);

  const cleanupNote =
    typeof investor.cleanup_note === "string" ? investor.cleanup_note : "";

  const invGeo = canonicalArray(toArray(investor.geo_focus), GEO_SYNONYMS);

  const precision = precisionModifier(
    stage.stageCount,
    sector.sectorCount,
    geo.geoCount,
    cleanupNote
  );

  const penalties = weakFitPenalties({
    stageScore: stage.score,
    sectorScore: sector.score,
    geoScore: geo.score,
    geoMatchType: geo.match_type,
    stageCount: stage.stageCount,
    sectorCount: sector.sectorCount,
    geoCount: geo.geoCount,
    invGeo,
  });

  const total =
    stage.score + sector.score + geo.score + precision.score + penalties.score;
  const bounded = Math.max(0, Math.min(100, total));

  const reasons = [
    stage.reason,
    sector.reason,
    geo.reason,
    precision.reason,
  ].filter((r): r is string => !!r);

  const warnings = [
    stage.warning,
    sector.warning,
    geo.warning,
    precision.warning,
    ...penalties.warnings,
  ].filter((w): w is string => !!w);

  const fit_label = fitLabelFor(bounded);

  console.log("[premium-scoring] trace", {
    startup: {
      stage: startup.stage,
      sectors: startup.sectors,
      country: startup.country,
      region: startup.region,
    },
    investor: {
      investor_name: investor.investor_name,
      stage_focus: investor.stage_focus,
      sector_focus: investor.sector_focus,
      geo_focus: investor.geo_focus,
      hq_country: investor.hq_country,
      hq_region: investor.hq_region,
    },
    decisions: {
      stage: { score: stage.score, count: stage.stageCount, hardMiss: stage.hardMiss },
      sector: { score: sector.score, count: sector.sectorCount },
      geo: { score: geo.score, type: geo.match_type, count: geo.geoCount },
      precision: precision.score,
      penalties: penalties.score,
    },
    score: bounded,
    fit_label,
    warnings,
  });

  return {
    score: Math.round(bounded * 100) / 100,
    reasons,
    warnings,
    breakdown: {
      stage: stage.score,
      sector: sector.score,
      geo: geo.score,
      precision: precision.score,
      penalties: penalties.score,
    },
    geo_match_type: geo.match_type,
    fit_label,
    sector_count: sector.sectorCount,
    stage_count: stage.stageCount,
  };
}

// ---------------------------------------------------------------------------
// Deterministic sort comparator for premium results
// ---------------------------------------------------------------------------

const GEO_TIEBREAK: Record<GeoMatchType, number> = {
  exact: 4,
  regional: 3,
  global: 2,
  fallback: 1,
  none: 0,
};

export interface PremiumSortable extends PremiumMatchResult {
  investor_name: string;
}

export function premiumCompare(a: PremiumSortable, b: PremiumSortable): number {
  if (b.score !== a.score) return b.score - a.score;
  const g = GEO_TIEBREAK[b.geo_match_type] - GEO_TIEBREAK[a.geo_match_type];
  if (g !== 0) return g;
  // Sharper sector first (lower count wins, treat 0 as very broad).
  const aSec = a.sector_count === 0 ? Infinity : a.sector_count;
  const bSec = b.sector_count === 0 ? Infinity : b.sector_count;
  if (aSec !== bSec) return aSec - bSec;
  const aStg = a.stage_count === 0 ? Infinity : a.stage_count;
  const bStg = b.stage_count === 0 ? Infinity : b.stage_count;
  if (aStg !== bStg) return aStg - bStg;
  return a.investor_name.localeCompare(b.investor_name);
}
