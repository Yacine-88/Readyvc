"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import {
  parseReasoning,
  FIT_LABEL_DISPLAY,
  fitLabelFromScore,
  type MatchListItem,
  type RationaleTone,
} from "@/lib/investors/ui-types";

interface MatchResultsListProps {
  matches: MatchListItem[];
  startupProfileId?: string;
}

const TONE_CLASS: Record<RationaleTone, string> = {
  positive: "bg-success/10 text-success border-success/20",
  neutral: "bg-soft text-ink-secondary border-border",
  info: "bg-accent/10 text-accent border-accent/20",
  warning: "bg-warning/10 text-warning border-warning/20",
};

const FIT_PILL_CLASS: Record<RationaleTone, string> = {
  positive: "bg-success/10 text-success",
  neutral: "bg-soft text-ink-secondary",
  info: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
};

// Dimensions actually populated by premium_v2.
function dimensions(b: MatchListItem["breakdown"]): { label: string; value: number; max: number }[] {
  return [
    { label: "Stage", value: b.stage, max: 35 },
    { label: "Sector", value: b.sector, max: 25 },
    { label: "Geo", value: b.geo, max: 25 },
    { label: "Fit", value: b.check_size, max: 15 },
  ];
}

export function MatchResultsList({
  matches,
  startupProfileId,
}: MatchResultsListProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius-lg)] p-8 text-center">
        <p className="text-sm text-muted">
          No investors match these filters. Try broadening the search.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => {
        const href = startupProfileId
          ? `/investors/${m.investor_id}?from=match&profileId=${encodeURIComponent(
              startupProfileId
            )}`
          : `/investors/${m.investor_id}`;
        const location = [m.hq_country, m.hq_region]
          .filter((x): x is string => !!x && x.trim().length > 0)
          .join(" · ");

        const parsed = parseReasoning(m.breakdown.reasoning ?? "");
        const fit = parsed.fit_label
          ? FIT_LABEL_DISPLAY[parsed.fit_label] ??
            fitLabelFromScore(m.breakdown.total)
          : fitLabelFromScore(m.breakdown.total);
        const totalDisplay = (Math.round(m.breakdown.total * 10) / 10).toFixed(1);
        const hasGeo = m.breakdown.geo > 0;

        return (
          <li key={m.investor_id}>
            <Link
              href={href}
              className="group block bg-card border border-border rounded-[var(--radius-lg)] px-4 py-3 transition-all duration-150 hover:border-ink/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div className="flex-shrink-0 w-7 text-right">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-muted">
                    {String(m.rank_position).padStart(2, "0")}
                  </span>
                </div>

                {/* Identity + rationale */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink truncate group-hover:underline">
                      {m.investor_name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${FIT_PILL_CLASS[fit.tone]}`}
                    >
                      {fit.text}
                    </span>
                    {location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                  </div>

                  {/* Rationale + dimension pills on one row */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {parsed.rationales.slice(0, 4).map((r, i) => (
                      <span
                        key={`${r.label}-${i}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TONE_CLASS[r.tone]}`}
                      >
                        {r.label}
                      </span>
                    ))}
                    {!hasGeo && (
                      <span className="inline-flex items-center text-[10px] font-medium text-muted/80">
                        · no geo fit
                      </span>
                    )}
                  </div>
                </div>

                {/* Score + dimension dots */}
                <div className="flex-shrink-0 flex items-center gap-3 self-center">
                  <div className="hidden sm:flex items-center gap-1.5">
                    {dimensions(m.breakdown).map((d) => {
                      const pct = d.max > 0 ? Math.max(0, Math.min(1, d.value / d.max)) : 0;
                      const color =
                        pct >= 0.66
                          ? "bg-success"
                          : pct >= 0.33
                          ? "bg-ink/70"
                          : pct > 0
                          ? "bg-muted"
                          : "bg-border";
                      return (
                        <div
                          key={d.label}
                          className="flex flex-col items-center gap-0.5"
                          title={`${d.label}: ${Math.round(d.value)} / ${d.max}`}
                        >
                          <span className={`h-1.5 w-6 rounded-full ${color}`} />
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                            {d.label[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-right min-w-[48px]">
                    <div className="font-mono text-base font-semibold text-ink-secondary tabular-nums leading-none">
                      {totalDisplay}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted mt-0.5">
                      / 100
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
