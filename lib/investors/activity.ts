/**
 * Activity scoring helpers.
 *
 * We want a single 0..1 number describing "how active is this investor right
 * now". We weight recent years more heavily, sum the weighted deal counts,
 * then apply a saturating curve so a very prolific investor doesn't
 * completely dominate a merely-active one.
 */

/**
 * Per-year weights. Tune these in one place.
 *
 * Unknown / older years default to a small weight (see DEFAULT_YEAR_WEIGHT).
 */
export const YEAR_WEIGHTS: Record<number, number> = {
  2018: 0.4,
  2019: 0.5,
  2020: 0.6,
  2021: 0.8,
  2022: 1.0,
  2023: 1.2,
  2024: 1.3,
  2025: 1.3,
  2026: 1.3,
};

const DEFAULT_YEAR_WEIGHT = 0.3;

/**
 * Saturation constant used in `1 - exp(-weightedTotal / SAT)`.
 * With SAT=20: an investor with ~20 weighted deals sits around 0.63;
 * ~60 weighted deals saturates near 0.95. Tune if distribution is off.
 */
const SAT = 20;

export function computeActivityScoreRaw(
  activityByYear: Record<number, number>,
  dealCount: number
): number {
  let weightedTotal = 0;
  for (const [yearStr, count] of Object.entries(activityByYear)) {
    const year = Number(yearStr);
    const w = YEAR_WEIGHTS[year] ?? DEFAULT_YEAR_WEIGHT;
    weightedTotal += (count ?? 0) * w;
  }

  // Fallback: if no yearly data, use raw deal_count with default weight.
  if (weightedTotal === 0 && dealCount > 0) {
    weightedTotal = dealCount * DEFAULT_YEAR_WEIGHT;
  }

  if (weightedTotal <= 0) return 0;
  const score = 1 - Math.exp(-weightedTotal / SAT);
  return Math.max(0, Math.min(1, score));
}
