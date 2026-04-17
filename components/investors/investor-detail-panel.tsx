"use client";

import { ExternalLink, MapPin, TrendingUp } from "lucide-react";
import type {
  InvestorDetailPayload,
  MatchListItem,
} from "@/lib/investors/ui-types";
import type { CanonicalStage } from "@/lib/investors/types";
import { ActivityMiniChart } from "./activity-mini-chart";
import { MatchScoreBadge } from "./match-score-badge";

interface InvestorDetailPanelProps {
  payload: InvestorDetailPayload;
  matchCallout?: MatchListItem | null;
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

const STAGE_LABELS: Record<CanonicalStage, string> = {
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  growth: "Growth",
  other: "Other",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-soft border border-border text-[11px] font-semibold text-ink">
      {children}
    </span>
  );
}

export function InvestorDetailPanel({
  payload,
  matchCallout,
}: InvestorDetailPanelProps) {
  const { investor, inferred, recent_deals } = payload;
  const location = [investor.hq_city, investor.hq_country, investor.hq_region]
    .filter((x): x is string => !!x)
    .join(" · ");

  const explicitGeo = investor.explicit_geo_focus ?? [];
  const explicitSectors = investor.explicit_sector_focus ?? [];
  const explicitStages = investor.explicit_stage_focus ?? [];
  const hasExplicit =
    explicitGeo.length + explicitSectors.length + explicitStages.length > 0;

  const inferredCountries = inferred?.countries?.slice(0, 6) ?? [];
  const inferredSectors = inferred?.sectors?.slice(0, 6) ?? [];
  const inferredStages = inferred?.stages;
  const inferredStageEntries: { stage: CanonicalStage; count: number }[] = inferredStages
    ? (Object.entries(inferredStages) as [CanonicalStage, number][])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([stage, count]) => ({ stage, count }))
    : [];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero panel */}
      <section className="bg-ink text-white rounded-[var(--radius-lg)] p-6 md:p-10">
        <p className="eyebrow text-white/60 mb-3">Investor profile</p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-white">
              {investor.investor_name}
            </h1>
            {location && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {location}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {investor.investor_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                {investor.investor_type}
              </span>
            )}
            {investor.source && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                Source: {investor.source}
              </span>
            )}
            {investor.website && (
              <a
                href={investor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold text-white"
              >
                Website
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {inferred && (
          <div className="mt-6 grid grid-cols-3 gap-4 md:gap-8 max-w-xl">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">
                Deals tracked
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
                {inferred.deal_count}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">
                Typical check
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
                {inferred.typical_check_usd
                  ? fmtMoney(inferred.typical_check_usd.median)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">
                Activity score
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
                {Math.round(inferred.activity_score_raw)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Match callout */}
      {matchCallout && (
        <section className="bg-accent/10 border border-accent/30 rounded-[var(--radius-lg)] p-5 md:p-6">
          <div className="flex items-start gap-4">
            <MatchScoreBadge score={matchCallout.breakdown.total} size="lg" />
            <div className="flex-1">
              <p className="eyebrow text-accent mb-1">
                Why this fits your startup
              </p>
              <p className="text-sm text-ink leading-snug">
                {matchCallout.breakdown.reasoning ||
                  "Ranked by geography, sector, stage, activity, and check size."}
              </p>
              <p className="mt-2 text-xs text-muted">
                Ranked #{matchCallout.rank_position} in your saved match set.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Two columns: explicit + inferred */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Explicit */}
        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
          <p className="eyebrow mb-3">Declared focus</p>
          {hasExplicit ? (
            <div className="flex flex-col gap-4">
              {explicitGeo.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Geography
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {explicitGeo.map((g) => (
                      <Chip key={g}>{g}</Chip>
                    ))}
                  </div>
                </div>
              )}
              {explicitSectors.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Sectors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {explicitSectors.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
              )}
              {explicitStages.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Stages
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {explicitStages.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
              )}
              {(investor.explicit_check_min != null ||
                investor.explicit_check_max != null) && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Check size
                  </p>
                  <p className="text-sm font-mono text-ink tabular-nums">
                    {fmtMoney(investor.explicit_check_min)} –{" "}
                    {fmtMoney(investor.explicit_check_max)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No declared focus on file.
            </p>
          )}
        </div>

        {/* Inferred */}
        <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Inferred from deal activity</p>
            <TrendingUp className="h-4 w-4 text-muted" aria-hidden="true" />
          </div>

          {inferred ? (
            <div className="flex flex-col gap-4">
              {inferredCountries.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Top countries
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {inferredCountries.map((c) => (
                      <Chip key={c.country}>
                        {c.country}
                        <span className="ml-1 text-muted font-mono tabular-nums">
                          {c.count}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {inferredSectors.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Top sectors
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {inferredSectors.map((s) => (
                      <Chip key={s.sector}>
                        {s.sector}
                        <span className="ml-1 text-muted font-mono tabular-nums">
                          {s.count}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {inferredStageEntries.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                    Stage mix
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {inferredStageEntries.map((s) => (
                      <Chip key={s.stage}>
                        {STAGE_LABELS[s.stage]}
                        <span className="ml-1 text-muted font-mono tabular-nums">
                          {s.count}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted mb-2">
                  Yearly activity
                </p>
                <ActivityMiniChart data={inferred.activity_by_year} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Not enough deal data to infer focus.
            </p>
          )}
        </div>
      </section>

      {/* Recent deals */}
      <section className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-soft">
          <p className="eyebrow">Recent deals</p>
        </div>
        {recent_deals.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted">No deal history on file.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-soft">
                <tr className="text-left">
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Company
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Country
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Sector
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Round
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted text-right">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent_deals.map((row) => {
                  const d = row.deals;
                  return (
                    <tr key={row.deal_id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3 text-ink font-medium">
                        {d.company_name ?? "—"}
                        {row.is_lead && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                            Lead
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {d.company_country ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {d.sector ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {d.round_type ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-ink font-mono tabular-nums text-right">
                        {fmtMoney(d.amount_raised_usd)}
                      </td>
                      <td className="px-5 py-3 text-muted font-mono tabular-nums">
                        {fmtDate(d.announced_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
