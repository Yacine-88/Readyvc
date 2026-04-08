/**
 * Professional Valuation Methods Library
 * Implements industry-standard valuation approaches for startups
 */

export interface ProjectionInputs {
  currentRevenue: number;
  baseRevenueGrowth: number; // % per year
  margin2026?: number;
  margin2027?: number;
  margin2028?: number;
  margin2029?: number;
  margin2030?: number;
}

export interface ValuationScenario {
  name: "Conservative" | "Base" | "Aggressive";
  growthRate: number; // multiplier: 0.7, 1.0, 1.3
}

export interface ValuationMethodResult {
  method: string;
  valuation: number;
  multiple?: number;
  reasoning: string;
}

/**
 * REVENUE MULTIPLES METHOD
 * Formula: Current Revenue × Revenue Multiple
 * Industry multiples sourced from comparable transactions
 */
export function calculateRevenueMultiples(
  currentRevenue: number,
  sector: string,
  stage: string
): { conservative: number; base: number; aggressive: number } {
  // Industry-standard multiples by sector and stage
  const multiples: Record<string, Record<string, { low: number; mid: number; high: number }>> = {
    SaaS: {
      seed: { low: 3, mid: 5, high: 8 },
      seriesA: { low: 5, mid: 8, high: 12 },
      seriesB: { low: 8, mid: 12, high: 18 },
    },
    Fintech: {
      seed: { low: 2, mid: 4, high: 7 },
      seriesA: { low: 4, mid: 7, high: 11 },
      seriesB: { low: 7, mid: 11, high: 16 },
    },
    AgriTech: {
      seed: { low: 1.5, mid: 3, high: 5 },
      seriesA: { low: 3, mid: 5, high: 9 },
      seriesB: { low: 5, mid: 9, high: 14 },
    },
  };

  const sectorMultiples = multiples[sector] || multiples.SaaS;
  const stageMultiples = sectorMultiples[stage.toLowerCase()] || sectorMultiples.seed;

  return {
    conservative: currentRevenue * stageMultiples.low,
    base: currentRevenue * stageMultiples.mid,
    aggressive: currentRevenue * stageMultiples.high,
  };
}

/**
 * DCF (DISCOUNTED CASH FLOW) METHOD
 * Formula: PV of future cash flows + terminal value
 * Assumes exit in 5-7 years at 3-5x revenue
 */
export function calculateDCF(
  projections: ProjectionInputs,
  exitYear: number = 2031,
  discountRate: number = 0.4, // 40% for startups
  exitMultiple: number = 4
): number {
  const currentYear = new Date().getFullYear();
  const years = exitYear - currentYear;

  let cashFlows: number[] = [];
  let revenue = projections.currentRevenue;
  let growthRate = projections.baseRevenueGrowth / 100;

  // Project 5 years of revenue
  const margins = [
    projections.margin2026 || -0.2,
    projections.margin2027 || -0.1,
    projections.margin2028 || 0,
    projections.margin2029 || 0.15,
    projections.margin2030 || 0.25,
  ];

  for (let i = 0; i < Math.min(5, years); i++) {
    revenue = revenue * (1 + growthRate);
    const cashFlow = revenue * (margins[i] || margins[margins.length - 1]);
    cashFlows.push(cashFlow);
  }

  // Calculate PV of cash flows
  let pv = 0;
  cashFlows.forEach((cf, i) => {
    pv += cf / Math.pow(1 + discountRate, i + 1);
  });

  // Terminal value = revenue at exit × exit multiple
  const exitRevenue = revenue * Math.pow(1 + growthRate, years - 5);
  const terminalValue = (exitRevenue * exitMultiple) / Math.pow(1 + discountRate, years);

  return pv + terminalValue;
}

/**
 * COMPARABLE MULTIPLES METHOD
 * Uses median EV/Revenue multiples from comparable companies
 * Automatically adjusted for growth rate vs benchmarks
 */
export function calculateComparableMultiples(
  currentRevenue: number,
  growthRate: number,
  medianMarketMultiple: number = 8
): number {
  // Growth-adjusted multiple: higher growth = higher multiple
  // Reference: median SaaS multiples are 8x; grows 10% per 10% additional growth rate
  const growthAdjustment = growthRate > 0.3 ? 1.0 + (growthRate - 0.3) * 2 : 1.0;
  const adjustedMultiple = medianMarketMultiple * growthAdjustment;

  return currentRevenue * adjustedMultiple;
}

/**
 * EBITDA METHOD (if profitability exists)
 * Formula: EBITDA × Industry Multiple
 * Typical SaaS multiples: 8-15x EBITDA
 */
export function calculateEBITDAMultiple(
  currentRevenue: number,
  ebidaMargin: number, // as decimal: 0.15 = 15%
  ebitdaMultiple: number = 10
): number | null {
  // Only apply if profitable (EBITDA > 0)
  if (ebidaMargin <= 0) return null;

  const ebitda = currentRevenue * ebidaMargin;
  return ebitda * ebitdaMultiple;
}

/**
 * Venture Capital Method
 * Backwards from target return and exit valuation
 */
export function calculateVCMethod(
  investmentAmount: number,
  targetReturn: number = 10, // 10x return
  exitValuation: number,
  investorOwnershipPercentage: number
): number {
  // Required ownership = Investment × Target Return / Exit Valuation
  const requiredOwnership = (investmentAmount * targetReturn) / exitValuation;

  // Pre-money = Exit × (1 - Required Ownership) / Discount Rate
  // Simplified: Pre-money = Investment / Investor Ownership - Investment
  const preMoney = investmentAmount / investorOwnershipPercentage - investmentAmount;

  return Math.max(0, preMoney);
}

/**
 * Calculate valuation range with all methods
 * Returns aggregated view of multiple valuation approaches
 */
export function calculateValuationSummary(
  currentRevenue: number,
  sector: string,
  stage: string,
  growthRate: number,
  projections: ProjectionInputs
): {
  methods: ValuationMethodResult[];
  median: number;
  range: { low: number; high: number };
  averageMultiple: number;
} {
  const results: ValuationMethodResult[] = [];

  // Method 1: Revenue Multiples
  const multiples = calculateRevenueMultiples(currentRevenue, sector, stage);
  results.push({
    method: "Revenue Multiples (Conservative)",
    valuation: multiples.conservative,
    multiple: multiples.conservative / currentRevenue,
    reasoning: `Based on ${sector} ${stage} stage median multiples`,
  });
  results.push({
    method: "Revenue Multiples (Base)",
    valuation: multiples.base,
    multiple: multiples.base / currentRevenue,
    reasoning: `Based on ${sector} ${stage} stage median multiples`,
  });
  results.push({
    method: "Revenue Multiples (Aggressive)",
    valuation: multiples.aggressive,
    multiple: multiples.aggressive / currentRevenue,
    reasoning: `Based on ${sector} ${stage} stage median multiples`,
  });

  // Method 2: DCF
  const dcfValuation = calculateDCF(projections);
  results.push({
    method: "Discounted Cash Flow (DCF)",
    valuation: dcfValuation,
    reasoning: "5-year projection with 40% discount rate and 4x exit multiple",
  });

  // Method 3: Comparable Multiples
  const comparableValuation = calculateComparableMultiples(currentRevenue, growthRate);
  results.push({
    method: "Comparable Multiples",
    valuation: comparableValuation,
    multiple: comparableValuation / currentRevenue,
    reasoning: "Growth-adjusted median market multiples for comparable companies",
  });

  // Sort by valuation and calculate stats
  const valuations = results.map((r) => r.valuation).sort((a, b) => a - b);
  const median = valuations[Math.floor(valuations.length / 2)];
  const low = Math.min(...valuations);
  const high = Math.max(...valuations);

  const multiples_list = results
    .filter((r) => r.multiple)
    .map((r) => r.multiple as number);
  const averageMultiple =
    multiples_list.length > 0
      ? multiples_list.reduce((a, b) => a + b, 0) / multiples_list.length
      : 0;

  return {
    methods: results,
    median,
    range: { low, high },
    averageMultiple,
  };
}
