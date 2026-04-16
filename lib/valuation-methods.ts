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
