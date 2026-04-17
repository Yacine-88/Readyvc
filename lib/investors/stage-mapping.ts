/**
 * Canonical funding-stage mapping.
 *
 * Two entry points:
 *   mapRoundTypeToStage  — for raw deal round_type strings (investor side)
 *   mapStartupStage      — for founder-provided profile.stage
 *
 * Philosophy: be conservative. When a label is ambiguous (e.g. "venture round"
 * with no qualifier) we return "other" rather than guess.
 */

import type { CanonicalStage } from "./types";

export const CANONICAL_STAGES: readonly CanonicalStage[] = [
  "pre-seed",
  "seed",
  "series-a",
  "growth",
  "other",
] as const;

function norm(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .trim();
}

export function mapRoundTypeToStage(
  raw: string | null | undefined
): CanonicalStage {
  const s = norm(raw);
  if (!s) return "other";

  // Pre-seed
  if (s === "pre seed" || s === "preseed" || s.includes("pre seed")) {
    return "pre-seed";
  }

  // Seed family
  if (
    s === "seed" ||
    s === "seed extension" ||
    s === "bridge" ||
    s === "pre series a" ||
    s === "seed plus" ||
    s === "seed+"
  ) {
    return "seed";
  }

  // Series A
  if (s === "series a" || s === "a") {
    return "series-a";
  }

  // Later stage / growth
  if (
    s === "series b" ||
    s === "series c" ||
    s === "series d" ||
    s === "series e" ||
    s === "series f" ||
    s === "growth" ||
    s === "late stage" ||
    s === "private equity" ||
    s === "pe" ||
    s === "mezzanine"
  ) {
    return "growth";
  }

  // Ambiguous / unknown
  return "other";
}

export function mapStartupStage(
  raw: string | null | undefined
): CanonicalStage {
  const s = norm(raw);
  if (!s) return "other";

  if (s === "pre seed" || s === "preseed") return "pre-seed";
  if (s === "seed" || s === "seed extension" || s === "bridge") return "seed";
  if (s === "series a" || s === "a") return "series-a";
  if (
    s === "series b" ||
    s === "series c" ||
    s === "series d" ||
    s === "growth" ||
    s === "late stage" ||
    s === "private equity"
  ) {
    return "growth";
  }

  return "other";
}
