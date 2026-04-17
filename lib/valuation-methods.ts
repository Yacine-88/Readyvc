/**
 * VCReady Valuation Engine
 *
 * Implements three industry-standard valuation approaches:
 *   1. VC Method — backward from target IRR and exit valuation
 *   2. Revenue Multiple Method — ARR × sector/stage benchmarks
 *   3. Comparables-Informed Range — sector/stage/geo median bands
 *
 * Benchmark sources:
 *   - Damodaran (NYU Stern): EV/Revenue multiples by sector
 *     https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html#multiples
 *   - Eval.tech: Startup transaction multiples database
 *     https://www.eval.tech/free-valuation-multiples/
 *
 * All figures are benchmark guidance, not guarantees.
 * Outputs are scenario-based and intended for fundraising preparation.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectionInputs {
  currentRevenue: number;
  baseRevenueGrowth: number; // percentage, e.g. 50 = 50%
  margin2026: number; // decimal, e.g. -0.2
  margin2027: number;
  margin2028: number;
  margin2029: number;
  margin2030: number;
}

export interface YearlyProjection {
  year: number;
  revenue: number;
  revenueBase: number;
  revenueOpt: number;
  revenuePess: number;
  ebitda: number;
  ebitdaBase: number;
  margin: number;
}

export interface ValuationMethodResult {
  method: string;
  valuation: number;
  low: number;
  high: number;
  multiple?: number;
  reasoning: string;
  source: string;
}

export interface InvestorMetrics {
  preMoney: number;
  postMoney: number;
  investorEquityEntry: number; // %
  investorEquityAtExit: number; // % after dilution
  dilutionPercent: number;
  exitProceeds: number;
  cashOnCash: number;
  impliedIRR: number;
}

export interface ScenarioResult {
  name: "Pessimistic" | "Base" | "Optimistic";
  growthMultiplier: number;
  exitRevenue: number;
  exitValuation: number;
  vcMethodValuation: number;
  revenueMultipleValuation: number;
  blendedValuation: number;
}

export interface ValuationSummary {
  vcMethod: ValuationMethodResult;
  revenueMultiple: ValuationMethodResult;
  comparables: ValuationMethodResult;
  blended: { low: number; base: number; high: number };
  averageMultiple: number;
  investor: InvestorMetrics;
  scenarios: ScenarioResult[];
  projections: YearlyProjection[];
  analysis: string[];
}

// ─── Benchmark Data ───────────────────────────────────────────────────────────

/**
 * EV/Revenue multiples by sector and stage.
 * Low / Median / High bands.
 *
 * Sources:
 * - Damodaran 2024 Technology sector medians (EV/Sales)
 * - Eval.tech startup transaction database (early-stage premiums)
 * - Publicly available VC survey data (2022-2024 vintages)
 */
const REVENUE_MULTIPLES: Record<
  string,
  Record<string, { low: number; median: number; high: number }>
> = {
  // ── Legacy keys (kept for backward compatibility) ─────────────────────────
  SaaS: {
    "Pre-seed": { low: 2, median: 5, high: 10 },
    Seed: { low: 4, median: 7, high: 12 },
    "Series A": { low: 6, median: 10, high: 16 },
    "Series B": { low: 8, median: 14, high: 22 },
    "Series C": { low: 10, median: 18, high: 28 },
  },
  "Health Tech": {
    "Pre-seed": { low: 1.5, median: 4, high: 8 },
    Seed: { low: 3, median: 6, high: 10 },
    "Series A": { low: 5, median: 8, high: 14 },
    "Series B": { low: 7, median: 12, high: 18 },
    "Series C": { low: 9, median: 16, high: 24 },
  },
  "Consumer Tech": {
    "Pre-seed": { low: 1, median: 2.5, high: 5 },
    Seed: { low: 2, median: 4, high: 7 },
    "Series A": { low: 3, median: 6, high: 10 },
    "Series B": { low: 5, median: 9, high: 14 },
    "Series C": { low: 7, median: 12, high: 18 },
  },
  // ── Current taxonomy ───────────────────────────────────────────────────────
  "SaaS / B2B Software": {
    "Pre-seed": { low: 2, median: 5, high: 10 },
    Seed: { low: 4, median: 7, high: 12 },
    "Series A": { low: 6, median: 10, high: 16 },
    "Series B": { low: 8, median: 14, high: 22 },
    "Series C": { low: 10, median: 18, high: 28 },
  },
  "AI / Machine Learning": {
    "Pre-seed": { low: 3, median: 7, high: 15 },
    Seed: { low: 6, median: 12, high: 22 },
    "Series A": { low: 10, median: 18, high: 30 },
    "Series B": { low: 14, median: 24, high: 40 },
    "Series C": { low: 18, median: 30, high: 50 },
  },
  "Developer Tools": {
    "Pre-seed": { low: 2, median: 5, high: 10 },
    Seed: { low: 4, median: 7, high: 12 },
    "Series A": { low: 6, median: 10, high: 16 },
    "Series B": { low: 8, median: 14, high: 22 },
    "Series C": { low: 10, median: 18, high: 28 },
  },
  Cybersecurity: {
    "Pre-seed": { low: 2, median: 5, high: 10 },
    Seed: { low: 4, median: 7, high: 13 },
    "Series A": { low: 6, median: 10, high: 17 },
    "Series B": { low: 8, median: 14, high: 23 },
    "Series C": { low: 10, median: 18, high: 30 },
  },
  Fintech: {
    "Pre-seed": { low: 1.5, median: 3, high: 6 },
    Seed: { low: 3, median: 5, high: 9 },
    "Series A": { low: 4, median: 7, high: 12 },
    "Series B": { low: 6, median: 10, high: 16 },
    "Series C": { low: 8, median: 14, high: 20 },
  },
  InsurTech: {
    "Pre-seed": { low: 1.5, median: 3, high: 6 },
    Seed: { low: 2.5, median: 5, high: 9 },
    "Series A": { low: 4, median: 7, high: 12 },
    "Series B": { low: 5, median: 9, high: 15 },
    "Series C": { low: 7, median: 12, high: 18 },
  },
  "Healthtech / Digital Health": {
    "Pre-seed": { low: 1.5, median: 4, high: 8 },
    Seed: { low: 3, median: 6, high: 10 },
    "Series A": { low: 5, median: 8, high: 14 },
    "Series B": { low: 7, median: 12, high: 18 },
    "Series C": { low: 9, median: 16, high: 24 },
  },
  Biotech: {
    "Pre-seed": { low: 2, median: 5, high: 12 },
    Seed: { low: 4, median: 8, high: 16 },
    "Series A": { low: 6, median: 12, high: 22 },
    "Series B": { low: 8, median: 16, high: 28 },
    "Series C": { low: 10, median: 20, high: 35 },
  },
  MedTech: {
    "Pre-seed": { low: 1.5, median: 4, high: 8 },
    Seed: { low: 3, median: 6, high: 11 },
    "Series A": { low: 5, median: 8, high: 14 },
    "Series B": { low: 7, median: 12, high: 19 },
    "Series C": { low: 9, median: 15, high: 24 },
  },
  Marketplace: {
    "Pre-seed": { low: 1.5, median: 4, high: 8 },
    Seed: { low: 3, median: 6, high: 10 },
    "Series A": { low: 4, median: 8, high: 14 },
    "Series B": { low: 6, median: 12, high: 20 },
    "Series C": { low: 8, median: 16, high: 26 },
  },
  "Consumer App": {
    "Pre-seed": { low: 1, median: 2.5, high: 5 },
    Seed: { low: 2, median: 4, high: 7 },
    "Series A": { low: 3, median: 6, high: 10 },
    "Series B": { low: 5, median: 9, high: 14 },
    "Series C": { low: 7, median: 12, high: 18 },
  },
  "E-commerce": {
    "Pre-seed": { low: 0.5, median: 1.5, high: 3 },
    Seed: { low: 1, median: 2.5, high: 5 },
    "Series A": { low: 2, median: 4, high: 8 },
    "Series B": { low: 3, median: 6, high: 11 },
    "Series C": { low: 4, median: 8, high: 14 },
  },
  AgriTech: {
    "Pre-seed": { low: 1, median: 2.5, high: 5 },
    Seed: { low: 2, median: 4, high: 7 },
    "Series A": { low: 3, median: 5, high: 9 },
    "Series B": { low: 4, median: 8, high: 13 },
    "Series C": { low: 6, median: 11, high: 17 },
  },
  "Cleantech / Climate": {
    "Pre-seed": { low: 1, median: 3, high: 6 },
    Seed: { low: 2, median: 5, high: 9 },
    "Series A": { low: 3, median: 6, high: 11 },
    "Series B": { low: 5, median: 9, high: 15 },
    "Series C": { low: 7, median: 12, high: 19 },
  },
  Other: {
    "Pre-seed": { low: 1, median: 2.5, high: 5 },
    Seed: { low: 2, median: 4, high: 7 },
    "Series A": { low: 3, median: 6, high: 10 },
    "Series B": { low: 5, median: 9, high: 14 },
    "Series C": { low: 7, median: 12, high: 18 },
  },
};

/**
 * Comparables-informed pre-money valuation ranges by stage.
 * Based on median disclosed round data (MENA + Global, 2021-2024).
 * Sources: Magnitt, Crunchbase, Pitchbook public reports.
 */
const COMPARABLES_RANGE: Record<string, { low: number; median: number; high: number }> = {
  "Pre-seed": { low: 500_000, median: 2_000_000, high: 6_000_000 },
  Seed: { low: 3_000_000, median: 8_000_000, high: 20_000_000 },
  "Series A": { low: 15_000_000, median: 35_000_000, high: 80_000_000 },
  "Series B": { low: 60_000_000, median: 120_000_000, high: 250_000_000 },
  "Series C": { low: 150_000_000, median: 300_000_000, high: 600_000_000 },
};

// ─── 5-Year Projections ───────────────────────────────────────────────────────

export function buildProjections(inputs: ProjectionInputs): YearlyProjection[] {
  const startYear = new Date().getFullYear() + 1;
  const margins = [
    inputs.margin2026,
    inputs.margin2027,
    inputs.margin2028,
    inputs.margin2029,
    inputs.margin2030,
  ];
  const growthRate = inputs.baseRevenueGrowth / 100;
  const years: YearlyProjection[] = [];

  let revBase = inputs.currentRevenue;
  let revOpt = inputs.currentRevenue;
  let revPess = inputs.currentRevenue;

  for (let i = 0; i < 5; i++) {
    revBase = revBase * (1 + growthRate);
    revOpt = revOpt * (1 + growthRate * 1.3);
    revPess = revPess * (1 + growthRate * 0.7);

    const margin = margins[i] ?? 0;
    years.push({
      year: startYear + i,
      revenue: revBase,
      revenueBase: revBase,
      revenueOpt: revOpt,
      revenuePess: revPess,
      ebitda: revBase * margin,
      ebitdaBase: revBase * margin,
      margin,
    });
  }
  return years;
}

// ─── VC Method ────────────────────────────────────────────────────────────────

/**
 * VC Method (Sahlman, 1987)
 *
 * Logic:
 *   1. Project exit revenue at year N using base growth
 *   2. Apply EV/Revenue exit multiple to get exit enterprise value
 *   3. Discount back to today at the investor's required IRR
 *   4. Required equity = Investment / PV of exit proceeds
 *   5. Pre-money = Investment / Investor% - Investment
 *
 * Inputs:
 *   - investmentAmount: cash in
 *   - investorEquity: ownership % offered (used to derive pre-money)
 *   - targetIRR: required annual return (decimal, e.g. 0.30 = 30%)
 *   - exitYear: hold period in years
 *   - exitRevenueMultiple: EV/Revenue at exit
 *   - exitRevenue: projected revenue at exit
 */
export function calculateVCMethod(params: {
  investmentAmount: number;
  investorEquity: number; // %
  targetIRR: number; // decimal
  exitYears: number;
  exitRevenueMultiple: number;
  exitRevenue: number;
}): ValuationMethodResult {
  const {
    investmentAmount,
    investorEquity,
    targetIRR,
    exitYears,
    exitRevenueMultiple,
    exitRevenue,
  } = params;

  // Exit enterprise value
  const exitEV = exitRevenue * exitRevenueMultiple;

  // What the investor's stake must be worth at exit to hit IRR
  const requiredExitValue = investmentAmount * Math.pow(1 + targetIRR, exitYears);

  // Required ownership at exit = required exit value / exit EV
  const requiredOwnership = requiredExitValue / exitEV;

  // Implied pre-money using investor's declared ownership %
  const equityFraction = investorEquity / 100;
  const postMoney = investmentAmount / equityFraction;
  const preMoney = postMoney - investmentAmount;

  // IRR-implied pre-money (what the math says pre-money should be)
  // preMoney_irr = Investment / requiredOwnership - Investment (ignoring dilution for simplicity)
  const postMoneyIRR = investmentAmount / requiredOwnership;
  const preMoneyIRR = postMoneyIRR - investmentAmount;

  // Blend offered pre-money vs IRR-implied (shows tension if equity % doesn't match IRR requirements)
  const blendedPreMoney = (preMoney + preMoneyIRR) / 2;

  const lowPre = Math.min(preMoney, preMoneyIRR) * 0.85;
  const highPre = Math.max(preMoney, preMoneyIRR) * 1.15;

  return {
    method: "VC Method",
    valuation: Math.max(0, blendedPreMoney),
    low: Math.max(0, lowPre),
    high: Math.max(0, highPre),
    multiple: blendedPreMoney / (investmentAmount || 1),
    reasoning: `Exit EV of $${(exitEV / 1_000_000).toFixed(1)}M at ${exitRevenueMultiple}x revenue in year ${exitYears}. IRR-required ownership: ${(requiredOwnership * 100).toFixed(1)}%.`,
    source: "Sahlman (1987) VC Method — Harvard Business School",
  };
}

// ─── Revenue Multiple Method ──────────────────────────────────────────────────

export function calculateRevenueMultipleMethod(
  currentRevenue: number,
  sector: string,
  stage: string
): ValuationMethodResult {
  const sectorData = REVENUE_MULTIPLES[sector] ?? REVENUE_MULTIPLES["Other"];
  const stageData = sectorData[stage] ?? sectorData["Series A"];

  return {
    method: "Revenue Multiple",
    valuation: currentRevenue * stageData.median,
    low: currentRevenue * stageData.low,
    high: currentRevenue * stageData.high,
    multiple: stageData.median,
    reasoning: `${sector} ${stage} median EV/Revenue: ${stageData.median}x (range ${stageData.low}x–${stageData.high}x).`,
    source: "Damodaran (NYU Stern) 2024 + Eval.tech transaction database",
  };
}

// ─── Comparables Method ───────────────────────────────────────────────────────

export function calculateComparablesMethod(
  stage: string,
  currentRevenue: number,
  growthRate: number // decimal
): ValuationMethodResult {
  const comp = COMPARABLES_RANGE[stage] ?? COMPARABLES_RANGE["Series A"];

  // Growth premium: if growth > 50% YoY, apply up to 40% premium on median
  const growthPremium = Math.min(1.4, 1 + Math.max(0, growthRate - 0.5) * 0.8);
  const adjustedMedian = comp.median * growthPremium;
  const adjustedHigh = comp.high * growthPremium;

  // Revenue sanity check: revenue multiple implied by comparables
  const impliedMultiple = currentRevenue > 0 ? adjustedMedian / currentRevenue : 0;

  return {
    method: "Comparables (Stage Median)",
    valuation: adjustedMedian,
    low: comp.low,
    high: adjustedHigh,
    multiple: impliedMultiple > 0 ? impliedMultiple : undefined,
    reasoning: `${stage} pre-money median range adjusted for ${(growthRate * 100).toFixed(0)}% YoY growth. Growth premium: ${((growthPremium - 1) * 100).toFixed(0)}%.`,
    source: "Magnitt 2024, Crunchbase, Pitchbook — disclosed round data",
  };
}

// ─── Investor Mechanics ───────────────────────────────────────────────────────

export function calculateInvestorMetrics(params: {
  investmentAmount: number;
  investorEquity: number; // % at entry
  exitYears: number;
  exitRevenue: number;
  exitRevenueMultiple: number;
  dilutionPerRound: number; // % additional dilution per future round (e.g. 15)
  futureRounds: number; // expected number of future rounds
}): InvestorMetrics {
  const {
    investmentAmount,
    investorEquity,
    exitYears,
    exitRevenue,
    exitRevenueMultiple,
    dilutionPerRound,
    futureRounds,
  } = params;

  const postMoney = investmentAmount / (investorEquity / 100);
  const preMoney = postMoney - investmentAmount;

  const exitEV = exitRevenue * exitRevenueMultiple;

  // Dilution: investor's % is diluted by each future round
  const dilutionFactor = Math.pow(1 - dilutionPerRound / 100, futureRounds);
  const investorEquityAtExit = investorEquity * dilutionFactor;
  const dilutionPercent = investorEquity - investorEquityAtExit;

  const exitProceeds = exitEV * (investorEquityAtExit / 100);
  const cashOnCash = exitProceeds / investmentAmount;

  // IRR: solve (1 + IRR)^exitYears = CoC → IRR = CoC^(1/exitYears) - 1
  const impliedIRR = cashOnCash > 0 ? Math.pow(cashOnCash, 1 / exitYears) - 1 : 0;

  return {
    preMoney,
    postMoney,
    investorEquityEntry: investorEquity,
    investorEquityAtExit,
    dilutionPercent,
    exitProceeds,
    cashOnCash,
    impliedIRR,
  };
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

export function buildScenarios(params: {
  currentRevenue: number;
  baseGrowthRate: number; // decimal
  exitYears: number;
  sector: string;
  stage: string;
  investmentAmount: number;
  investorEquity: number;
  targetIRR: number;
  exitRevenueMultiple: number;
}): ScenarioResult[] {
  const {
    currentRevenue,
    baseGrowthRate,
    exitYears,
    sector,
    stage,
    investmentAmount,
    investorEquity,
    targetIRR,
    exitRevenueMultiple,
  } = params;

  const scenarios: Array<{ name: "Pessimistic" | "Base" | "Optimistic"; mult: number }> = [
    { name: "Pessimistic", mult: 0.65 },
    { name: "Base", mult: 1.0 },
    { name: "Optimistic", mult: 1.35 },
  ];

  return scenarios.map(({ name, mult }) => {
    const adjustedGrowth = baseGrowthRate * mult;
    const exitRevenue = currentRevenue * Math.pow(1 + adjustedGrowth, exitYears);
    const exitValuation = exitRevenue * exitRevenueMultiple;

    const vcResult = calculateVCMethod({
      investmentAmount,
      investorEquity,
      targetIRR,
      exitYears,
      exitRevenueMultiple,
      exitRevenue,
    });

    const revResult = calculateRevenueMultipleMethod(currentRevenue, sector, stage);

    // Scenario-adjust revenue multiple valuation by growth delta vs base
    const growthFactor = mult;
    const adjRevMultiple = revResult.valuation * growthFactor;

    const blended = (vcResult.valuation * 0.5 + adjRevMultiple * 0.5);

    return {
      name,
      growthMultiplier: mult,
      exitRevenue,
      exitValuation,
      vcMethodValuation: vcResult.valuation,
      revenueMultipleValuation: adjRevMultiple,
      blendedValuation: Math.max(0, blended),
    };
  });
}

// ─── Founder Analysis ─────────────────────────────────────────────────────────

export function generateAnalysis(params: {
  vcMethod: ValuationMethodResult;
  revenueMultiple: ValuationMethodResult;
  comparables: ValuationMethodResult;
  investor: InvestorMetrics;
  sector: string;
  stage: string;
  growthRate: number;
  scenarios: ScenarioResult[];
}): string[] {
  const { vcMethod, revenueMultiple, comparables, investor, growthRate, scenarios } = params;
  const insights: string[] = [];

  const base = scenarios.find((s) => s.name === "Base");
  const pess = scenarios.find((s) => s.name === "Pessimistic");
  const opt = scenarios.find((s) => s.name === "Optimistic");

  // Valuation spread analysis
  const spread = vcMethod.high - vcMethod.low;
  const spreadPct = vcMethod.valuation > 0 ? spread / vcMethod.valuation : 0;
  if (spreadPct > 1.5) {
    insights.push(
      "Your valuation has a wide range across methods — this reflects genuine uncertainty at your stage. Investors will anchor to the lower bound unless you can substantiate your growth assumptions."
    );
  } else if (spreadPct < 0.5) {
    insights.push(
      "The three valuation methods are broadly aligned, which strengthens your negotiating position. Consistency across approaches is a positive signal."
    );
  }

  // Growth rate commentary
  if (growthRate >= 0.8) {
    insights.push(
      "Your growth rate (80%+) places you in the top quartile of comparable companies. Maintain supporting evidence — MoM cohort data is the most credible proof point for investors."
    );
  } else if (growthRate >= 0.4) {
    insights.push(
      "Your growth rate is solid and within the expected range for your stage. If you can demonstrate acceleration, multiples typically expand meaningfully."
    );
  } else if (growthRate < 0.2) {
    insights.push(
      "Sub-20% annual growth is below typical investor expectations at early stage. Consider whether pricing, market size, or go-to-market assumptions need revisiting before fundraising."
    );
  }

  // IRR attractiveness
  if (investor.impliedIRR >= 0.35) {
    insights.push(
      `Your investor return profile is attractive: implied IRR of ${(investor.impliedIRR * 100).toFixed(0)}% exceeds the typical 30% VC hurdle rate. This deal is likely competitive.`
    );
  } else if (investor.impliedIRR >= 0.20) {
    insights.push(
      `Your implied IRR of ${(investor.impliedIRR * 100).toFixed(0)}% is borderline for most institutional VCs (target: 30%+). Consider whether your exit multiple or valuation can be adjusted to improve the return profile.`
    );
  } else if (investor.impliedIRR > 0) {
    insights.push(
      `Your implied IRR of ${(investor.impliedIRR * 100).toFixed(0)}% is below the typical VC hurdle rate of 30%. This will likely be a blocker. Review your exit assumptions or consider whether dilution is being underestimated.`
    );
  }

  // Dilution warning
  if (investor.dilutionPercent > 15) {
    insights.push(
      `Expected dilution of ${investor.dilutionPercent.toFixed(1)}% across future rounds materially reduces investor exit proceeds. Be transparent with investors about your funding roadmap.`
    );
  }

  // Comparables alignment
  const compDelta =
    revenueMultiple.valuation > 0
      ? (comparables.valuation - revenueMultiple.valuation) / revenueMultiple.valuation
      : 0;
  if (compDelta > 0.3) {
    insights.push(
      "Your stage-based comparables suggest a higher valuation than the revenue multiple method. This gap may indicate investors are pricing in future potential — be ready to justify it with traction data."
    );
  } else if (compDelta < -0.3) {
    insights.push(
      "Your revenue multiple valuation exceeds stage comparables. Your pricing may appear aggressive to investors unfamiliar with your sector. Prepare detailed benchmarks to support the ask."
    );
  }

  // Scenario sensitivity
  if (base && pess && opt) {
    const sensitivity = opt.blendedValuation / (pess.blendedValuation || 1);
    if (sensitivity > 4) {
      insights.push(
        "Your valuation is highly sensitive to growth assumptions — the optimistic scenario is over 4× the pessimistic one. Investors will stress-test your projections hard. Build in downside credibility."
      );
    } else if (sensitivity < 2) {
      insights.push(
        "Your scenario range is relatively tight, suggesting the business has predictable fundamentals. This is a positive signal for investors prioritising capital preservation."
      );
    }
  }

  return insights;
}

// ─── Master Calculator ─────────────────────────────────────────────────────────

export function calculateFullValuation(params: {
  currentRevenue: number;
  sector: string;
  stage: string;
  baseGrowthRate: number; // decimal
  projectionInputs: ProjectionInputs;
  investmentAmount: number;
  investorEquity: number;
  targetIRR: number; // decimal
  exitYears: number;
  exitRevenueMultiple: number;
  dilutionPerRound: number;
  futureRounds: number;
}): ValuationSummary {
  const {
    currentRevenue,
    sector,
    stage,
    baseGrowthRate,
    projectionInputs,
    investmentAmount,
    investorEquity,
    targetIRR,
    exitYears,
    exitRevenueMultiple,
    dilutionPerRound,
    futureRounds,
  } = params;

  // Build projections
  const projections = buildProjections(projectionInputs);
  const exitRevenue = currentRevenue * Math.pow(1 + baseGrowthRate, exitYears);

  // Method results
  const vcMethod = calculateVCMethod({
    investmentAmount,
    investorEquity,
    targetIRR,
    exitYears,
    exitRevenueMultiple,
    exitRevenue,
  });

  const revenueMultiple = calculateRevenueMultipleMethod(currentRevenue, sector, stage);
  const comparables = calculateComparablesMethod(stage, currentRevenue, baseGrowthRate);

  // Blended range
  const allVals = [vcMethod.valuation, revenueMultiple.valuation, comparables.valuation];
  const allLows = [vcMethod.low, revenueMultiple.low, comparables.low];
  const allHighs = [vcMethod.high, revenueMultiple.high, comparables.high];
  const blendedBase =
    allVals.filter((v) => v > 0).reduce((a, b) => a + b, 0) /
    allVals.filter((v) => v > 0).length;

  const blended = {
    low: Math.min(...allLows.filter((v) => v > 0)),
    base: blendedBase,
    high: Math.max(...allHighs),
  };

  const multiples = [revenueMultiple.multiple, comparables.multiple].filter(
    (m): m is number => m !== undefined && m > 0
  );
  const averageMultiple =
    multiples.length > 0 ? multiples.reduce((a, b) => a + b, 0) / multiples.length : 0;

  // Investor mechanics
  const investor = calculateInvestorMetrics({
    investmentAmount,
    investorEquity,
    exitYears,
    exitRevenue,
    exitRevenueMultiple,
    dilutionPerRound,
    futureRounds,
  });

  // Scenarios
  const scenarios = buildScenarios({
    currentRevenue,
    baseGrowthRate,
    exitYears,
    sector,
    stage,
    investmentAmount,
    investorEquity,
    targetIRR,
    exitRevenueMultiple,
  });

  // Analysis
  const analysis = generateAnalysis({
    vcMethod,
    revenueMultiple,
    comparables,
    investor,
    sector,
    stage,
    growthRate: baseGrowthRate,
    scenarios,
  });

  return {
    vcMethod,
    revenueMultiple,
    comparables,
    blended,
    averageMultiple,
    investor,
    scenarios,
    projections,
    analysis,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// V2 Engine — multi-method valuation with methodology transparency
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Berkus Method ────────────────────────────────────────────────────────────

/**
 * Berkus Method (Dave Berkus, 1996)
 *
 * Pre-revenue framework. Five risk-reduction factors, each contributing up to
 * a cap ($500K by default → max ~$2.5M pre-money). Frames the valuation
 * conversation around risk reduction rather than revenue projections.
 *
 * Use when:
 *   - Pre-seed or very early seed
 *   - Pre-revenue or minimal revenue
 *   - You want to anchor against qualitative risk factors
 *
 * Limitations:
 *   - Original $2.5M cap is low for 2024 — inflation-adjusted closer to $3.5–4M
 *   - All inputs are self-reported and qualitative
 *   - Ignores sector dynamics and market size
 */

export interface BerkusFactors {
  soundIdea: number;              // 0–100
  prototype: number;              // 0–100
  qualityTeam: number;            // 0–100
  strategicRelationships: number; // 0–100
  productRollout: number;         // 0–100
}

export function calculateBerkusMethod(
  factors: BerkusFactors,
  maxPerFactor: number = 500_000,
): ValuationMethodResult {
  const total =
    (factors.soundIdea / 100) * maxPerFactor +
    (factors.prototype / 100) * maxPerFactor +
    (factors.qualityTeam / 100) * maxPerFactor +
    (factors.strategicRelationships / 100) * maxPerFactor +
    (factors.productRollout / 100) * maxPerFactor;

  return {
    method: "Berkus Method",
    valuation: total,
    low: total * 0.7,
    high: total * 1.3,
    reasoning: `5 risk factors × up to $${Math.round(maxPerFactor / 1000)}K each. Caps pre-money near ~$${((maxPerFactor * 5) / 1_000_000).toFixed(1)}M.`,
    source: "Dave Berkus (1996) — pre-revenue framework",
  };
}

// ─── Scorecard Method ─────────────────────────────────────────────────────────

/**
 * Scorecard Method (Bill Payne, 2001)
 *
 * Takes a regional/sector base valuation (typically the stage median) and
 * adjusts by seven weighted qualitative factors. Each factor is rated
 * against the average peer: 100 = average, 150 = 50% above, 50 = 50% below.
 *
 * Use when:
 *   - Pre-seed or seed with peer comparables available
 *   - As a reality check against method-driven valuations
 *
 * Limitations:
 *   - Output only as good as the peer base
 *   - Founders tend to over-rate their own factors by 10–20%
 *   - Doesn't price growth or revenue directly
 */

export interface ScorecardFactors {
  team: number;          // 0–200, 100 = average peer
  opportunity: number;   // 0–200
  product: number;       // 0–200
  competition: number;   // 0–200
  marketing: number;     // 0–200
  capitalNeeds: number;  // 0–200
  other: number;         // 0–200
}

const SCORECARD_WEIGHTS: Record<keyof ScorecardFactors, number> = {
  team: 0.30,
  opportunity: 0.25,
  product: 0.15,
  competition: 0.10,
  marketing: 0.10,
  capitalNeeds: 0.05,
  other: 0.05,
};

export function calculateScorecardMethod(
  baseValuation: number,
  factors: ScorecardFactors,
): ValuationMethodResult {
  const keys = Object.keys(SCORECARD_WEIGHTS) as (keyof ScorecardFactors)[];
  const multiplier = keys.reduce(
    (acc, key) => acc + (factors[key] / 100) * SCORECARD_WEIGHTS[key],
    0,
  );

  const valuation = baseValuation * multiplier;

  return {
    method: "Scorecard Method",
    valuation,
    low: valuation * 0.75,
    high: valuation * 1.25,
    reasoning: `Peer base $${(baseValuation / 1_000_000).toFixed(1)}M × ${multiplier.toFixed(2)}x composite factor (team ${factors.team}, market ${factors.opportunity}, product ${factors.product}).`,
    source: "Bill Payne (2001) — Scorecard Valuation Method",
  };
}

// ─── Stage-based method weighting ─────────────────────────────────────────────

export interface MethodWeights {
  vcMethod: number;
  revenueMultiple: number;
  comparables: number;
  berkus: number;
  scorecard: number;
}

export type MethodKey = keyof MethodWeights;

/**
 * Returns how much each method contributes to the blended valuation,
 * based on stage and whether the company has meaningful revenue.
 *
 *   Pre-seed, no revenue:  Scorecard 40% · Berkus 30% · Comps 25% · VC 5%
 *   Pre-seed, w/ revenue:  Scorecard 30% · Berkus 20% · Comps 25% · VC 10% · RevMult 15%
 *   Seed, no revenue:      Scorecard 35% · Berkus 20% · Comps 30% · VC 10% · RevMult 5%
 *   Seed, w/ revenue:      Scorecard 20% · Berkus 10% · Comps 25% · VC 15% · RevMult 30%
 *   Series A:              Scorecard 10% · Comps 25% · VC 30% · RevMult 35%
 *   Series B+:             Comps 25% · VC 35% · RevMult 40%
 */
export function getMethodWeights(stage: string, hasRevenue: boolean): MethodWeights {
  const s = stage.toLowerCase();

  if (s.includes("pre")) {
    return hasRevenue
      ? { scorecard: 0.30, berkus: 0.20, comparables: 0.25, vcMethod: 0.10, revenueMultiple: 0.15 }
      : { scorecard: 0.40, berkus: 0.30, comparables: 0.25, vcMethod: 0.05, revenueMultiple: 0.00 };
  }
  if (s === "seed") {
    return hasRevenue
      ? { scorecard: 0.20, berkus: 0.10, comparables: 0.25, vcMethod: 0.15, revenueMultiple: 0.30 }
      : { scorecard: 0.35, berkus: 0.20, comparables: 0.30, vcMethod: 0.10, revenueMultiple: 0.05 };
  }
  if (s.includes("series a")) {
    return { scorecard: 0.10, berkus: 0.00, comparables: 0.25, vcMethod: 0.30, revenueMultiple: 0.35 };
  }
  // Series B, C, or later
  return { scorecard: 0.00, berkus: 0.00, comparables: 0.25, vcMethod: 0.35, revenueMultiple: 0.40 };
}

function normalizeStageKey(stage: string): string {
  const s = stage.toLowerCase().replace(/\s+/g, "");
  if (s.includes("pre")) return "Pre-seed";
  if (s.includes("seed")) return "Seed";
  if (s.includes("seriesa")) return "Series A";
  if (s.includes("seriesb")) return "Series B";
  if (s.includes("seriesc")) return "Series C";
  return stage;
}

// ─── Method metadata (for UI explanation) ─────────────────────────────────────

export const METHOD_META: Record<MethodKey, {
  title: string;
  tagline: string;
  description: string;
  whenRelevant: string;
  limitations: string[];
}> = {
  vcMethod: {
    title: "VC Method",
    tagline: "Backward from target IRR and exit value",
    description:
      "Projects exit revenue at year N, applies an exit multiple to derive enterprise value, then discounts back at the investor's required IRR to solve for today's pre-money.",
    whenRelevant:
      "When the business has a clear exit path and a credible revenue trajectory. Strongest from Series A onwards.",
    limitations: [
      "Highly sensitive to exit multiple and IRR assumptions",
      "Dilution from future rounds is modelled linearly — reality is messier",
      "At pre-seed it over-weights speculative exit modelling",
    ],
  },
  revenueMultiple: {
    title: "Revenue Multiple",
    tagline: "Current ARR × sector/stage benchmark",
    description:
      "Applies the median EV/Revenue multiple for your sector and stage to current annualised revenue.",
    whenRelevant:
      "When revenue is meaningful and a relevant sector peer set exists. Most reliable from seed with revenue onwards.",
    limitations: [
      "Not applicable if revenue ≈ 0 (any multiple × 0 is still 0)",
      "Sector medians vary widely between public and private markets",
      "Doesn't capture growth rate or unit economics directly",
    ],
  },
  comparables: {
    title: "Comparables Range",
    tagline: "Stage-median pre-money with growth premium",
    description:
      "Uses disclosed round data for your stage to set a baseline, then applies a growth premium (up to +40% for >50% YoY growth).",
    whenRelevant:
      "Across all stages. Particularly useful when revenue is immaterial but stage benchmarks exist.",
    limitations: [
      "Median ≠ your deal — outliers often drive how investors actually price",
      "Geography matters (African pre-seed prices differently from US)",
      "Survivorship bias: only closed rounds are reported",
    ],
  },
  berkus: {
    title: "Berkus Method",
    tagline: "5-factor pre-revenue risk framework",
    description:
      "Assigns up to $500K to each of 5 risk-reduction factors: sound idea, prototype, team, strategic relationships, product rollout. Caps pre-money near $2.5M.",
    whenRelevant:
      "Pre-seed and very early seed, especially pre-revenue. Frames the valuation around risk reduction, not financial projections.",
    limitations: [
      "Original $2.5M cap is low for 2024 — inflation-adjusted closer to $3.5–4M",
      "All inputs are subjective and self-reported",
      "Ignores market size and sector dynamics entirely",
    ],
  },
  scorecard: {
    title: "Scorecard Method",
    tagline: "Peer base × weighted qualitative factors",
    description:
      "Starts from the regional/sector median valuation for your stage, then adjusts with 7 weighted factors: team (30%), market (25%), product (15%), competition, marketing, capital need, other.",
    whenRelevant:
      "Pre-seed and seed with access to peer comparables. Excellent reality check against method-driven numbers.",
    limitations: [
      "Only as good as the peer base valuation chosen",
      "Founders consistently rate their factors 10–20% higher than investors would",
      "Doesn't directly price growth or unit economics",
    ],
  },
};

// ─── Founder-facing interpretation ────────────────────────────────────────────

export interface FounderInterpretation {
  positioning: "conservative" | "in-range" | "aggressive" | "unclear";
  positioningText: string;
  rangeLogic: string;
  primaryMethod: string;
  primaryWeight: number;
  leastReliable: string;
  challenges: string[];
  strengthen: string[];
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export interface MethodContribution {
  key: MethodKey;
  result: ValuationMethodResult;
  weight: number;       // original stage weight (before re-normalisation)
  normWeight: number;   // after re-normalisation across applicable methods
  applicable: boolean;
  reasonSkipped?: string;
}

export function interpretValuation(params: {
  stage: string;
  currentRevenue: number;
  growthRate: number;
  blended: { low: number; base: number; high: number };
  methods: MethodContribution[];
}): FounderInterpretation {
  const { stage, currentRevenue, growthRate, blended, methods } = params;

  const applicable = methods.filter(m => m.applicable && m.normWeight > 0);
  const sorted = [...applicable].sort((a, b) => b.normWeight - a.normWeight);
  const primary = sorted[0];
  const least = sorted[sorted.length - 1];

  const applicableBases = applicable.map(m => m.result.valuation).filter(v => v > 0);
  const methodsMedian = medianOf(applicableBases);
  const gap = methodsMedian > 0 ? (blended.base - methodsMedian) / methodsMedian : 0;

  let positioning: FounderInterpretation["positioning"];
  let positioningText: string;
  if (applicable.length === 0 || blended.base <= 0) {
    positioning = "unclear";
    positioningText = "Not enough applicable inputs to position this valuation. Add revenue, qualitative inputs, or deal terms.";
  } else if (Math.abs(gap) < 0.15) {
    positioning = "in-range";
    positioningText = `Your valuation sits within 15% of the median across applicable methods — investors will see this as reasonable and defensible.`;
  } else if (gap >= 0.15) {
    positioning = "aggressive";
    positioningText = `Your valuation is ~${Math.round(gap * 100)}% above the method median. Expect investors to probe every input feeding the higher-end methods.`;
  } else {
    positioning = "conservative";
    positioningText = `Your valuation is ~${Math.round(Math.abs(gap) * 100)}% below the method median. You may be leaving money on the table — double-check your inputs.`;
  }

  const challenges: string[] = [];
  const strengthen: string[] = [];
  const stageLower = stage.toLowerCase();
  const isPreSeed = stageLower.includes("pre");
  const isEarly = isPreSeed || stageLower === "seed";

  if (isPreSeed && currentRevenue === 0) {
    challenges.push("Pre-revenue pre-seed valuations hinge on team credibility and market thesis. Expect deep questioning on why you specifically win this market.");
    strengthen.push("Surface 2–3 unambiguous team credentials: prior exits, decade-plus domain expertise, insider relationships, or proprietary data access.");
  }

  if (!isPreSeed && growthRate > 0 && growthRate < 0.3) {
    challenges.push("Sub-30% growth at seed+ invites pushback. Investors want to see acceleration or a clear unlock planned.");
    strengthen.push("Show MoM cohort retention, a specific growth unlock (new channel, pricing change, geographic expansion), or a signed enterprise pipeline.");
  }

  if (positioning === "aggressive") {
    challenges.push("Your ask is above the method median — be ready to defend every high-end assumption with data, not narrative.");
    strengthen.push("Bring external validation: signed LOIs, strategic investor interest, or a competitive round signal.");
  }

  if (isEarly && currentRevenue > 0) {
    strengthen.push("Include a 6-month MRR history chart in your data room — early traction is the strongest defence for a premium early-stage valuation.");
  }

  const rangeRatio = blended.low > 0 ? blended.high / blended.low : 0;
  if (rangeRatio > 4) {
    challenges.push(`Your range spans ${rangeRatio.toFixed(1)}× from low to high — investors read this as uncertainty about what you're worth.`);
    strengthen.push(`Narrow the range by committing to the primary method (${primary?.result.method ?? "—"}) and justifying why it dominates for your profile.`);
  }

  if (isPreSeed && !isEarly) {
    // unreachable, placeholder
  }

  if (challenges.length === 0) {
    challenges.push("No obvious red flags — but every investor will still challenge your growth trajectory and market size assumptions.");
  }
  if (strengthen.length === 0) {
    strengthen.push(`Tighten the narrative around your primary method (${primary?.result.method ?? "—"}). Have two independent data points ready for every claim.`);
  }

  const rangeLogic =
    applicable.length > 0
      ? `Weighted blend of ${applicable.length} applicable method${applicable.length === 1 ? "" : "s"}. Primary: ${primary?.result.method ?? "—"} (${Math.round((primary?.normWeight ?? 0) * 100)}% of the blend).`
      : "No methods currently applicable — add inputs to activate the engine.";

  return {
    positioning,
    positioningText,
    rangeLogic,
    primaryMethod: primary?.result.method ?? "—",
    primaryWeight: primary?.normWeight ?? 0,
    leastReliable: least?.result.method ?? "—",
    challenges,
    strengthen,
  };
}

// ─── V2 Master Calculator ─────────────────────────────────────────────────────

export interface ValuationSummaryV2 extends ValuationSummary {
  berkus: ValuationMethodResult;
  scorecard: ValuationMethodResult;
  methodWeights: MethodWeights;
  methodContributions: MethodContribution[];
  interpretation: FounderInterpretation;
  peerBase: number;
  hasRevenue: boolean;
}

export function calculateValuationV2(params: {
  currentRevenue: number;
  sector: string;
  stage: string;
  baseGrowthRate: number;
  projectionInputs: ProjectionInputs;
  investmentAmount: number;
  investorEquity: number;
  targetIRR: number;
  exitYears: number;
  exitRevenueMultiple: number;
  dilutionPerRound: number;
  futureRounds: number;
  qualitative: {
    berkus: BerkusFactors;
    scorecard: ScorecardFactors;
  };
  peerBase?: number;
}): ValuationSummaryV2 {
  const v1 = calculateFullValuation(params);

  const hasRevenue = params.currentRevenue > 0;
  const weights = getMethodWeights(params.stage, hasRevenue);

  // Berkus
  const berkus = calculateBerkusMethod(params.qualitative.berkus);

  // Scorecard — anchor on stage comparables median unless explicit override
  const stageKey = normalizeStageKey(params.stage);
  const compRange = COMPARABLES_RANGE[stageKey] ?? COMPARABLES_RANGE["Seed"];
  const peerBase = params.peerBase ?? compRange.median;
  const scorecard = calculateScorecardMethod(peerBase, params.qualitative.scorecard);

  // Applicability
  const applicable: Record<MethodKey, boolean> = {
    vcMethod:        params.investmentAmount > 0 && params.investorEquity > 0 && params.exitYears > 0,
    revenueMultiple: hasRevenue,
    comparables:     true,
    berkus:          weights.berkus > 0,
    scorecard:       weights.scorecard > 0 && peerBase > 0,
  };

  const reasons: Partial<Record<MethodKey, string>> = {
    vcMethod:        !applicable.vcMethod ? "Missing investment / equity / exit inputs" : undefined,
    revenueMultiple: !applicable.revenueMultiple ? "No current revenue — revenue multiples require meaningful ARR" : undefined,
    berkus:          !applicable.berkus ? "Berkus is most relevant at pre-seed / seed stage" : undefined,
    scorecard:       !applicable.scorecard ? "Scorecard is most relevant at pre-seed / seed stage" : undefined,
  };

  const raw: MethodContribution[] = [
    { key: "vcMethod",        result: v1.vcMethod,        weight: weights.vcMethod,        normWeight: 0, applicable: applicable.vcMethod,        reasonSkipped: reasons.vcMethod },
    { key: "revenueMultiple", result: v1.revenueMultiple, weight: weights.revenueMultiple, normWeight: 0, applicable: applicable.revenueMultiple, reasonSkipped: reasons.revenueMultiple },
    { key: "comparables",     result: v1.comparables,     weight: weights.comparables,     normWeight: 0, applicable: applicable.comparables },
    { key: "berkus",          result: berkus,             weight: weights.berkus,          normWeight: 0, applicable: applicable.berkus,          reasonSkipped: reasons.berkus },
    { key: "scorecard",       result: scorecard,          weight: weights.scorecard,       normWeight: 0, applicable: applicable.scorecard,       reasonSkipped: reasons.scorecard },
  ];

  const sumActive = raw.filter(m => m.applicable && m.weight > 0).reduce((s, m) => s + m.weight, 0);
  for (const m of raw) {
    m.normWeight = m.applicable && sumActive > 0 ? m.weight / sumActive : 0;
  }

  // Weighted blend
  let blendedBase = 0, blendedLow = 0, blendedHigh = 0;
  for (const m of raw) {
    if (m.normWeight <= 0) continue;
    blendedBase += m.result.valuation * m.normWeight;
    blendedLow  += m.result.low       * m.normWeight;
    blendedHigh += m.result.high      * m.normWeight;
  }
  const blended = { low: blendedLow, base: blendedBase, high: blendedHigh };

  const interpretation = interpretValuation({
    stage: params.stage,
    currentRevenue: params.currentRevenue,
    growthRate: params.baseGrowthRate,
    blended,
    methods: raw,
  });

  return {
    ...v1,
    blended,
    berkus,
    scorecard,
    methodWeights: weights,
    methodContributions: raw,
    interpretation,
    peerBase,
    hasRevenue,
  };
}
