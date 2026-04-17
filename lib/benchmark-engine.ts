/**
 * benchmark-engine.ts
 *
 * Reusable benchmark intelligence layer, built on top of the
 * COMPARABLES_DATA dataset. Designed to be called both from the
 * /comparables page and (later) from /dashboard for "you vs market" panels.
 *
 * No React imports — pure computation, safe to use anywhere.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComparableDeal {
  name: string;
  country: string;
  geo: string;
  sector: string;
  stage: string;
  raised: number;
  valuation: number | null;
  multiple: number | null;
  year: number;
  source: string;
}

export type BenchmarkConfidence = "high" | "medium" | "low";

export interface BenchmarkResult {
  // Peer set metadata
  peerCount: number;
  countriesCount: number;
  sectorsCount: number;
  yearRange: [number, number];

  // Raised ($M)
  medianRaised: number;
  avgRaised: number;
  p25Raised: number;
  p75Raised: number;
  raisedBracket: string;          // e.g. "$25M – $120M (P25–P75)"

  // Valuation ($M) — only computed where data exists
  valuationCoverage: number;       // 0–100 (% of peer set with valuation data)
  medianValuation: number | null;
  avgValuation: number | null;
  p25Valuation: number | null;
  p75Valuation: number | null;

  // EV/Revenue multiple — only computed where data exists
  multipleCoverage: number;
  medianMultiple: number | null;
  avgMultiple: number | null;

  // Distribution
  topCountry: string;
  topSector: string;
  dominantStage: string;
  sectorBreakdown: { sector: string; count: number; pct: number }[];
  stageBreakdown:  { sector: string; count: number; pct: number }[];

  // Confidence & interpretation
  confidence: BenchmarkConfidence;
  confidenceReason: string;
  insights: string[];              // founder-facing interpretation bullets
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * s.length);
  return s[Math.min(idx, s.length - 1)];
}

function fmtM(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1)    return `$${Math.round(v)}M`;
  return `$${(v * 1000).toFixed(0)}K`;
}

function topByFrequency<T extends string>(arr: T[]): T | "" {
  if (arr.length === 0) return "";
  const freq: Record<string, number> = {};
  for (const x of arr) freq[x] = (freq[x] ?? 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as T;
}

function breakdown(arr: string[]): { sector: string; count: number; pct: number }[] {
  const freq: Record<string, number> = {};
  for (const x of arr) freq[x] = (freq[x] ?? 0) + 1;
  const total = arr.length || 1;
  return Object.entries(freq)
    .map(([sector, count]) => ({ sector, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

const STAGE_LABEL: Record<string, string> = {
  preSeed: "Pre-Seed", seed: "Seed",
  seriesA: "Series A", seriesB: "Series B", seriesC: "Series C",
  seriesD: "Series D", seriesE: "Series E", seriesG: "Series G",
  ventureRound: "Venture Round", ipo: "IPO",
};

const SECTOR_LABEL: Record<string, string> = {
  fintech: "Fintech", saas: "SaaS", agritech: "AgriTech",
  logistics: "Logistics", energy: "Energy", deeptech: "DeepTech",
  edtech: "EdTech", healthtech: "HealthTech", retail: "Retail",
  marketplace: "Marketplace", travel: "Travel", telecom: "Telecom",
  cleantech: "CleanTech",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeBenchmark(deals: ComparableDeal[]): BenchmarkResult {
  const n = deals.length;

  // ── Raised ──────────────────────────────────────────────────────
  const raised      = deals.map((d) => d.raised);
  const medRaised   = median(raised);
  const avgRaised_  = average(raised);
  const p25Raised   = percentile(raised, 25);
  const p75Raised   = percentile(raised, 75);
  const raisedBracket =
    n > 0
      ? `${fmtM(p25Raised)} – ${fmtM(p75Raised)} (P25–P75)`
      : "—";

  // ── Valuation ────────────────────────────────────────────────────
  const vDeals   = deals.filter((d) => d.valuation !== null).map((d) => d.valuation as number);
  const valCov   = n > 0 ? Math.round((vDeals.length / n) * 100) : 0;
  const medVal   = vDeals.length > 0 ? median(vDeals) : null;
  const avgVal   = vDeals.length > 0 ? average(vDeals) : null;
  const p25Val   = vDeals.length > 0 ? percentile(vDeals, 25) : null;
  const p75Val   = vDeals.length > 0 ? percentile(vDeals, 75) : null;

  // ── Multiple ─────────────────────────────────────────────────────
  const mDeals   = deals.filter((d) => d.multiple !== null).map((d) => d.multiple as number);
  const mulCov   = n > 0 ? Math.round((mDeals.length / n) * 100) : 0;
  const medMul   = mDeals.length > 0 ? median(mDeals) : null;
  const avgMul   = mDeals.length > 0 ? average(mDeals) : null;

  // ── Distribution ─────────────────────────────────────────────────
  const countries   = [...new Set(deals.map((d) => d.country))];
  const sectors     = [...new Set(deals.map((d) => d.sector))];
  const topCountry  = topByFrequency(deals.map((d) => d.country));
  const topSector   = topByFrequency(deals.map((d) => d.sector));
  const domStage    = topByFrequency(deals.map((d) => d.stage));
  const years       = deals.map((d) => d.year);
  const yearRange: [number, number] = n > 0
    ? [Math.min(...years), Math.max(...years)]
    : [0, 0];

  const sectorBreakdown = breakdown(deals.map((d) => d.sector));
  const stageBreakdown  = breakdown(deals.map((d) => d.stage));

  // ── Confidence ───────────────────────────────────────────────────
  let confidence: BenchmarkConfidence;
  let confidenceReason: string;

  if (n >= 12 && valCov >= 40) {
    confidence = "high";
    confidenceReason = `${n} peers, ${valCov}% with valuation data — statistically solid.`;
  } else if (n >= 6) {
    confidence = "medium";
    confidenceReason = `${n} peers — directional. ${valCov >= 30 ? "Valuation coverage is adequate." : "Valuation data is sparse; focus on raised amounts."}`;
  } else {
    confidence = "low";
    confidenceReason = `Only ${n} peer${n === 1 ? "" : "s"} — adjust filters to broaden the comparison.`;
  }

  // ── Insights ─────────────────────────────────────────────────────
  const insights: string[] = [];

  // Peer set depth
  if (n >= 15) insights.push(`Large peer set (${n} deals) — benchmarks are statistically robust.`);
  else if (n >= 8) insights.push(`${n} comparable deals — representative for directional benchmarking.`);
  else if (n >= 4) insights.push(`${n} comparable deals — useful signal, but broaden filters for more confidence.`);
  else             insights.push(`${n} comparable deal${n === 1 ? "" : "s"} — too narrow for reliable benchmarks. Try removing filters.`);

  // Raised bracket
  if (n >= 3) {
    insights.push(`Most rounds in this selection raised between ${fmtM(p25Raised)} and ${fmtM(p75Raised)}.`);
  }

  // Sector concentration
  if (sectorBreakdown.length > 0) {
    const top = sectorBreakdown[0];
    const topLabel = SECTOR_LABEL[top.sector] ?? top.sector;
    if (top.pct >= 60)
      insights.push(`Market is heavily concentrated in ${topLabel} (${top.pct}% of this selection).`);
    else if (top.pct >= 40)
      insights.push(`${topLabel} leads this selection at ${top.pct}% — sector concentration is moderate.`);
    else
      insights.push(`Selection is well diversified across ${sectors.length} sector${sectors.length === 1 ? "" : "s"}.`);
  }

  // Valuation data quality
  if (valCov >= 60) {
    insights.push(`Valuation data available for ${valCov}% of peers — median valuation is ${medVal !== null ? fmtM(medVal) : "N/A"}.`);
  } else if (valCov > 0) {
    insights.push(`Valuation data is available for only ${valCov}% of peers — treat median as indicative.`);
  } else {
    insights.push(`No valuation data in this selection — raised amounts are the primary benchmark.`);
  }

  // Stage distribution
  if (stageBreakdown.length > 0) {
    const domLabel = STAGE_LABEL[domStage] ?? domStage;
    insights.push(`${domLabel} rounds dominate this selection (${stageBreakdown[0].pct}% of deals).`);
  }

  // Geographic note
  if (countries.length === 1) {
    insights.push(`All deals in this selection are from ${topCountry} — single-country benchmark.`);
  } else if (topCountry) {
    insights.push(`${topCountry} is the most represented country (${deals.filter((d) => d.country === topCountry).length} deals).`);
  }

  return {
    peerCount:       n,
    countriesCount:  countries.length,
    sectorsCount:    sectors.length,
    yearRange,
    medianRaised:    medRaised,
    avgRaised:       avgRaised_,
    p25Raised,
    p75Raised,
    raisedBracket,
    valuationCoverage: valCov,
    medianValuation:   medVal,
    avgValuation:      avgVal,
    p25Valuation:      p25Val,
    p75Valuation:      p75Val,
    multipleCoverage:  mulCov,
    medianMultiple:    medMul,
    avgMultiple:       avgMul,
    topCountry,
    topSector,
    dominantStage:     domStage,
    sectorBreakdown,
    stageBreakdown,
    confidence,
    confidenceReason,
    insights,
  };
}

// ─── "You vs Market" helper ───────────────────────────────────────────────────
// Designed for future /dashboard integration.
// Pass your startup's numbers and the benchmark to get a positioned summary.

export interface YouVsMarket {
  raisedVsMedian:    "above" | "below" | "at" | "unknown";
  raisedVsP75:       "above" | "below" | "unknown";
  valuationVsMedian: "above" | "below" | "at" | "unknown";
  raisedPercentile:  number | null;  // 0–100
  summary:           string;
}

export function compareToMarket(
  yourRaised: number | null,
  yourValuation: number | null,
  benchmark: BenchmarkResult
): YouVsMarket {
  // Only fully bail out when there are no peers at all — never because raise is missing.
  if (benchmark.peerCount === 0) {
    return {
      raisedVsMedian: "unknown", raisedVsP75: "unknown",
      valuationVsMedian: "unknown", raisedPercentile: null,
      summary: "No comparable deals found — broaden your filters.",
    };
  }

  const tol = 0.05;

  // ── Valuation position (independent of raised) ────────────────────────────
  const valuationVsMedian: YouVsMarket["valuationVsMedian"] =
    !yourValuation || !benchmark.medianValuation ? "unknown" :
    yourValuation > benchmark.medianValuation * (1 + tol) ? "above" :
    yourValuation < benchmark.medianValuation * (1 - tol) ? "below" : "at";

  // ── No raise target — return valuation-only result ────────────────────────
  if (yourRaised === null) {
    const valLabel =
      valuationVsMedian === "above" ? "above" :
      valuationVsMedian === "below" ? "below" :
      valuationVsMedian === "at"    ? "in line with" : null;

    return {
      raisedVsMedian:   "unknown",
      raisedVsP75:      "unknown",
      valuationVsMedian,
      raisedPercentile: null,
      summary: valLabel
        ? `Your valuation is ${valLabel} the peer median of ${fmtM(benchmark.medianValuation!)}.`
        : "Add a target raise in the Valuation tool to enable full market comparison.",
    };
  }

  // ── Raised position ───────────────────────────────────────────────────────
  const raisedVsMedian: YouVsMarket["raisedVsMedian"] =
    yourRaised > benchmark.medianRaised * (1 + tol) ? "above" :
    yourRaised < benchmark.medianRaised * (1 - tol) ? "below" : "at";
  const raisedVsP75 = yourRaised >= benchmark.p75Raised ? "above" : "below";

  // Rough percentile (linear interpolation across P25/median/P75)
  let raisedPercentile: number | null = null;
  if (yourRaised <= benchmark.p25Raised)
    raisedPercentile = Math.round((yourRaised / benchmark.p25Raised) * 25);
  else if (yourRaised <= benchmark.medianRaised)
    raisedPercentile = Math.round(25 + ((yourRaised - benchmark.p25Raised) / (benchmark.medianRaised - benchmark.p25Raised + 0.01)) * 25);
  else if (yourRaised <= benchmark.p75Raised)
    raisedPercentile = Math.round(50 + ((yourRaised - benchmark.medianRaised) / (benchmark.p75Raised - benchmark.medianRaised + 0.01)) * 25);
  else
    raisedPercentile = Math.min(99, Math.round(75 + ((yourRaised - benchmark.p75Raised) / (benchmark.p75Raised + 0.01)) * 15));

  // ── Summary sentence ──────────────────────────────────────────────────────
  const raisedLabel = raisedVsMedian === "above" ? "above" : raisedVsMedian === "below" ? "below" : "in line with";
  const valPart =
    valuationVsMedian === "unknown" ? "" :
    ` Your valuation is ${valuationVsMedian === "above" ? "above" : valuationVsMedian === "below" ? "below" : "in line with"} the peer median.`;

  const summary = `Your raise is ${raisedLabel} the peer median of ${fmtM(benchmark.medianRaised)}.${valPart}`;

  return { raisedVsMedian, raisedVsP75, valuationVsMedian, raisedPercentile, summary };
}
