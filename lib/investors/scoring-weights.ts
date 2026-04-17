/**
 * Scoring weights shared across scoring.ts and reasoning.ts.
 * Extracted to avoid a circular import.
 */

export const WEIGHTS = {
  geo: 0.25,
  sector: 0.25,
  stage: 0.2,
  activity: 0.2,
  check_size: 0.1,
} as const;
