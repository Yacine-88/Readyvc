/**
 * Normalization utilities for investor/deal ingestion.
 *
 * Philosophy: be conservative. Wrong merges are worse than missing matches.
 * We lowercase, trim, collapse whitespace, and strip a small allowlist of
 * noise tokens/punctuation — but we do NOT remove digits, country tokens, or
 * distinguishing suffixes that could cause unrelated entities to collide.
 */

// -- Text -------------------------------------------------------------------

export function normalizeText(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;
  // Collapse whitespace, normalize unicode (NFKC) so e.g. full-width chars
  // and accents fold consistently.
  return s.replace(/\s+/g, " ").normalize("NFKC");
}

// -- Name -------------------------------------------------------------------

// Terminal legal-entity / fund suffixes we can safely strip. Anything
// ambiguous (e.g. "capital", "partners", "ventures") is KEPT because it
// genuinely distinguishes fund names in the wild.
const SAFE_SUFFIXES = [
  "ltd",
  "ltd.",
  "llc",
  "l.l.c.",
  "inc",
  "inc.",
  "corp",
  "corp.",
  "corporation",
  "s.a.",
  "sa",
  "s.a.r.l.",
  "sarl",
  "plc",
  "gmbh",
  "ag",
  "bv",
  "b.v.",
  "pty",
  "pty.",
  "co.",
  "co",
  "company",
];

const PUNCT_TO_SPACE = /[,.\u2014\u2013_/\\()\[\]{}"“”'’`]+/g;
const AMP = /\s*&\s*/g;

export function normalizeName(input: unknown): string {
  const base = normalizeText(input);
  if (!base) return "";
  let s = base.toLowerCase();

  // Normalize ampersands to " and " BEFORE stripping punctuation so
  // "A & B" and "A and B" collapse to the same form.
  s = s.replace(AMP, " and ");

  // Replace punctuation with spaces (safer than deletion — avoids word-merging).
  s = s.replace(PUNCT_TO_SPACE, " ");

  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();

  // Strip a trailing legal suffix if present (repeat once in case of "xxx, inc llc").
  for (let pass = 0; pass < 2; pass++) {
    const parts = s.split(" ");
    const last = parts[parts.length - 1];
    if (last && SAFE_SUFFIXES.includes(last)) {
      parts.pop();
      s = parts.join(" ").trim();
    } else {
      break;
    }
  }

  return s;
}

// -- URL --------------------------------------------------------------------

export function normalizeUrl(input: unknown): string | null {
  const s = normalizeText(input);
  if (!s) return null;
  let candidate = s.toLowerCase();

  // Add protocol if missing so URL parser accepts it.
  if (!/^https?:\/\//.test(candidate)) {
    candidate = "https://" + candidate;
  }

  try {
    const u = new URL(candidate);
    let host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "");
    return host + path;
  } catch {
    return null;
  }
}

// -- Numeric ----------------------------------------------------------------

export function parseNumeric(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  const s = String(input).trim();
  if (!s) return null;

  // Strip currency symbols, spaces, commas (thousand separators).
  const cleaned = s.replace(/[\s,$€£¥]/g, "").replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// -- Date -------------------------------------------------------------------

/**
 * Returns ISO date string (YYYY-MM-DD) or null.
 * Accepts:
 *  - JS Date
 *  - ISO / parseable date string
 *  - Excel serial number (days since 1899-12-30 epoch used by Excel)
 */
export function parseDate(input: unknown): string | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    return isFinite(input.getTime()) ? input.toISOString().slice(0, 10) : null;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    // Excel serial: 1 = 1900-01-01 under Excel's (buggy) leap-year model.
    // Using 1899-12-30 as epoch gives the standard correction.
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + input * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    return isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }

  const s = String(input).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// -- Investor list splitting -----------------------------------------------

/**
 * Safely split a raw investor string into individual investor names.
 * The Africa dataset uses patterns like:
 *   "A, B, C, and D"
 *   "A, B (U.S.), C"
 *   "A and B"
 *
 * We split on commas and the " and " separator, then trim each piece.
 * We preserve parentheticals (e.g. "(U.S.)") since they disambiguate funds.
 */
export function splitInvestorList(raw: unknown): string[] {
  const s = normalizeText(raw);
  if (!s) return [];

  // Replace " and " (word-bounded) with a comma to unify separator.
  const unified = s.replace(/\s+and\s+/gi, ", ");

  return unified
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
