"use client";

import Link from "next/link";
import { ArrowRight, MapPin, AlertTriangle } from "lucide-react";
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

// Only keep dimensions the premium engine actually populates.
function dimensions(b: MatchListItem["breakdown"]): { label: string; value: number; max: number }[] {
  return [
    { label: "Stage", value: b.stage, max: 35 },
    { label: "Sector", value: b.sector, max: 25 },
    { label: "Geo", value: b.geo, max: 25 },
    { label: "Precision", value: b.check_size, max: 15 },
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
    <ul className="flex flex-col gap-4">
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
        const total = Math.round(m.breakdown.total);
        const hasGeo = m.breakdown.geo > 0;

        return (
          <li
            key={m.investor_id}
            className="bg-card border border-border rounded-[var(--radius-lg)] p-6 transition-all duration-150 hover:border-ink/30 hover:shadow-sm"
          >
            {/* Header: identity + score */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                    #{m.rank_position}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${TONE_CLASS[fit.tone]}`}
                  >
                    {fit.text}
                  </span>
                </div>
                <Link
                  href={href}
                  className="text-lg font-semibold text-ink hover:underline leading-tight block truncate"
                >
                  {m.investor_name}
                </Link>
                {location ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="truncate">{location}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">Location undisclosed</p>
                )}
              </div>

              <div className="flex flex-col items-end shrink-0">
                <div className="font-mono text-3xl font-bold text-ink tabular-nums leading-none">
                  {total}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mt-1">
                  / 100
                </div>
              </div>
            </div>

            {/* Rationale badges */}
            {(parsed.rationales.length > 0 || !hasGeo) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {parsed.rationales.map((r, i) => (
                  <span
                    key={`${r.label}-${i}`}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TONE_CLASS[r.tone]}`}
                  >
                    {r.label}
                  </span>
                ))}
                {!hasGeo && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TONE_CLASS.warning}`}
                  >
                    No geo fit
                  </span>
                )}
              </div>
            )}

            {/* Warnings */}
            {parsed.warnings.length > 0 && (
              <div className="mt-3 flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">
                  {parsed.warnings.join(" · ")}
                </span>
              </div>
            )}

            {/* Dimension bars */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {dimensions(m.breakdown).map((d) => {
                const pct = d.max > 0 ? Math.max(0, Math.min(100, (d.value / d.max) * 100)) : 0;
                return (
                  <div key={d.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {d.label}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-ink-secondary">
                        {Math.round(d.value)}<span className="text-muted">/{d.max}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-soft overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 66
                            ? "bg-success"
                            : pct >= 33
                            ? "bg-ink"
                            : "bg-muted"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer CTA */}
            <div className="mt-5 pt-4 border-t border-border flex justify-end">
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-accent transition-colors"
              >
                View investor
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
