/**
 * Template-driven, grounded reasoning strings for matches.
 *
 * Rules:
 *  - Start with the single strongest *weighted* signal.
 *  - Append up to 2 supporting signals.
 *  - Only reference facts that exist in the InvestorContext — never invent.
 *  - Flag missing data neutrally where relevant.
 */

import { WEIGHTS } from "./scoring-weights";
import type {
  CanonicalStage,
  InvestorContext,
  StartupContext,
} from "./types";

type Dim = "geo" | "sector" | "stage" | "activity" | "check_size";

interface Scores {
  geo: number;
  sector: number;
  stage: number;
  activity: number;
  check_size: number;
}

function recentYear(activityByYear: Record<number, number>): {
  year: number;
  count: number;
} | null {
  const entries = Object.entries(activityByYear)
    .map(([y, c]) => ({ year: Number(y), count: c }))
    .filter((e) => Number.isFinite(e.year) && e.count > 0)
    .sort((a, b) => b.year - a.year);
  return entries[0] ?? null;
}

function stageLabel(s: CanonicalStage): string {
  switch (s) {
    case "pre-seed":
      return "pre-seed";
    case "seed":
      return "seed";
    case "series-a":
      return "Series A";
    case "growth":
      return "growth-stage";
    default:
      return "unspecified-stage";
  }
}

function sentenceForGeo(
  startup: StartupContext,
  ctx: InvestorContext,
  score: number,
  lead: boolean
): string | null {
  const country = startup.country;
  if (!country) {
    if (lead && ctx.inferred_countries.length > 0) {
      const top = ctx.inferred_countries[0]!;
      return `Geo-wise, this investor has backed ${top.count} deals in ${top.country}.`;
    }
    return null;
  }

  const hit = ctx.inferred_countries.find(
    (c) => c.country.toLowerCase() === country.toLowerCase()
  );
  const recent = recentYear(ctx.activity_by_year);

  if (hit && hit.count > 0) {
    const rec = recent
      ? `, with ${recent.count} in ${recent.year}`
      : "";
    const verb = score >= 0.8 ? "Strong geo match" : "Geo fit";
    return `${verb} — backed ${hit.count} deal${hit.count === 1 ? "" : "s"} in ${hit.country}${rec}.`;
  }
  if (ctx.hq_country && ctx.hq_country.toLowerCase() === country.toLowerCase()) {
    return `Geo alignment via HQ — based in ${ctx.hq_country}, same country as your startup.`;
  }
  if (score < 0.4) {
    return `Geo fit unclear — no recent deal history in ${country} in our data.`;
  }
  return null;
}

function sentenceForSector(
  startup: StartupContext,
  ctx: InvestorContext,
  score: number,
  lead: boolean
): string | null {
  if (startup.sectors.length === 0) {
    if (lead) return `Sector preferences on the founder side are unspecified.`;
    return null;
  }
  const startupSet = new Set(startup.sectors.map((s) => s.toLowerCase()));
  const overlaps = ctx.inferred_sectors.filter((r) =>
    startupSet.has(r.sector.toLowerCase())
  );
  if (overlaps.length > 0) {
    const top = overlaps[0]!;
    const verb = score >= 0.8 ? "Strong sector overlap" : "Sector fit";
    return `${verb} — repeated ${top.sector} activity across ${top.count} deal${top.count === 1 ? "" : "s"}.`;
  }
  const explicitHit = ctx.explicit_sector_focus.find((s) =>
    startupSet.has(s.toLowerCase())
  );
  if (explicitHit) {
    return `Sector fit — stated focus includes ${explicitHit}.`;
  }
  if (score < 0.4) {
    return `Sector alignment with your profile is weaker.`;
  }
  return null;
}

function sentenceForStage(
  startup: StartupContext,
  ctx: InvestorContext,
  score: number,
  lead: boolean
): string | null {
  if (startup.stage === "other") {
    if (lead) return `Stage fit unclear — startup stage not specified.`;
    return null;
  }

  const hist = ctx.inferred_stages;
  const total =
    hist["pre-seed"] + hist["seed"] + hist["series-a"] + hist["growth"] + hist["other"];
  const label = stageLabel(startup.stage);

  if (total === 0) {
    return `Stage fit unclear due to limited deal history.`;
  }
  const count = hist[startup.stage] ?? 0;
  if (count > 0) {
    const verb = score >= 0.7 ? "Strong stage fit" : "Stage fit";
    return `${verb} — ${count} of ${total} recent deals at ${label}.`;
  }
  return `Stage fit less clear — limited ${label} deals in recent history.`;
}

function sentenceForActivity(
  ctx: InvestorContext,
  score: number,
  lead: boolean
): string | null {
  const recent = recentYear(ctx.activity_by_year);
  if (ctx.deal_count === 0) return null;
  if (lead) {
    const rec = recent ? `, ${recent.count} in ${recent.year}` : "";
    const verb = score >= 0.7 ? "Active backer" : "Moderately active";
    return `${verb} — ${ctx.deal_count} deal${ctx.deal_count === 1 ? "" : "s"} tracked${rec}.`;
  }
  if (score >= 0.7 && recent) {
    return `Momentum is strong (${recent.count} deals in ${recent.year}).`;
  }
  if (score < 0.3) return `Activity has been quiet in recent years.`;
  return null;
}

function sentenceForCheck(
  startup: StartupContext,
  ctx: InvestorContext,
  score: number,
  lead: boolean
): string | null {
  if (startup.fundraising_target_usd == null) return null;
  const target = startup.fundraising_target_usd;
  if (ctx.explicit_check_min != null || ctx.explicit_check_max != null) {
    const lo = ctx.explicit_check_min;
    const hi = ctx.explicit_check_max;
    if (score >= 0.9) {
      return `Check size aligned — stated range ${fmtMoney(lo)}–${fmtMoney(hi)} covers your ${fmtMoney(target)} target.`;
    }
    if (lead) {
      return `Check size is a partial fit against stated range ${fmtMoney(lo)}–${fmtMoney(hi)}.`;
    }
    return null;
  }
  const typ = ctx.typical_check_usd;
  if (typ) {
    if (score >= 0.8) {
      return `Check size consistent — typical deal ${fmtMoney(typ.p25)}–${fmtMoney(typ.p75)} straddles your target.`;
    }
    if (lead) return `Typical deal size ${fmtMoney(typ.p25)}–${fmtMoney(typ.p75)}.`;
  }
  return null;
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

export function buildReasoning(
  startup: StartupContext,
  ctx: InvestorContext,
  scores: Scores
): string {
  // Rank dimensions by weighted contribution
  const contribs: Array<{ dim: Dim; weighted: number; raw: number }> = [
    { dim: "geo", weighted: scores.geo * WEIGHTS.geo, raw: scores.geo },
    { dim: "sector", weighted: scores.sector * WEIGHTS.sector, raw: scores.sector },
    { dim: "stage", weighted: scores.stage * WEIGHTS.stage, raw: scores.stage },
    { dim: "activity", weighted: scores.activity * WEIGHTS.activity, raw: scores.activity },
    { dim: "check_size", weighted: scores.check_size * WEIGHTS.check_size, raw: scores.check_size },
  ];
  contribs.sort((a, b) => b.weighted - a.weighted);

  const out: string[] = [];
  let leadTaken = false;
  for (const c of contribs) {
    if (out.length >= 3) break;
    const isLead = !leadTaken;
    let s: string | null = null;
    switch (c.dim) {
      case "geo":
        s = sentenceForGeo(startup, ctx, c.raw, isLead);
        break;
      case "sector":
        s = sentenceForSector(startup, ctx, c.raw, isLead);
        break;
      case "stage":
        s = sentenceForStage(startup, ctx, c.raw, isLead);
        break;
      case "activity":
        s = sentenceForActivity(ctx, c.raw, isLead);
        break;
      case "check_size":
        s = sentenceForCheck(startup, ctx, c.raw, isLead);
        break;
    }
    if (s) {
      out.push(s);
      leadTaken = true;
    }
  }

  if (out.length === 0) {
    return `Limited data — scoring reflects the investor's overall activity profile rather than specific signals.`;
  }
  return out.join(" ");
}
