"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { MatchListItem } from "@/lib/investors/ui-types";
import { MatchScoreBadge } from "./match-score-badge";

interface MatchResultsListProps {
  matches: MatchListItem[];
  startupProfileId?: string;
}

interface Bar {
  label: string;
  value: number;
}

function breakdownBars(b: MatchListItem["breakdown"]): Bar[] {
  return [
    { label: "Geo", value: b.geo },
    { label: "Sector", value: b.sector },
    { label: "Stage", value: b.stage },
    { label: "Activity", value: b.activity },
    { label: "Check", value: b.check_size },
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
    <ul className="flex flex-col gap-3">
      {matches.map((m) => {
        const href = startupProfileId
          ? `/investors/${m.investor_id}?from=match&profileId=${encodeURIComponent(
              startupProfileId
            )}`
          : `/investors/${m.investor_id}`;
        const location = [m.hq_country, m.hq_region]
          .filter((x): x is string => !!x)
          .join(" · ");

        return (
          <li
            key={m.investor_id}
            className="bg-card border border-border rounded-[var(--radius-lg)] p-5 transition-all duration-150 hover:border-ink/30 hover:shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-start md:gap-6 gap-4">
              {/* Rank + score */}
              <div className="flex items-center gap-3 md:flex-col md:items-start md:w-20">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                  #{m.rank_position}
                </span>
                <MatchScoreBadge score={m.breakdown.total} size="md" />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={href}
                      className="text-base font-semibold text-ink hover:underline"
                    >
                      {m.investor_name}
                    </Link>
                    {location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <MapPin
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span className="truncate">{location}</span>
                      </p>
                    )}
                  </div>
                  <Link
                    href={href}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors flex-shrink-0"
                  >
                    View investor
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>

                {m.breakdown.reasoning && (
                  <p className="mt-2 text-sm text-ink-secondary leading-snug">
                    {m.breakdown.reasoning}
                  </p>
                )}

                {/* Breakdown bars */}
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {breakdownBars(m.breakdown).map((b) => {
                    const pct = Math.max(
                      0,
                      Math.min(100, Math.round(b.value))
                    );
                    return (
                      <div key={b.label}>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {b.label}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-muted">
                            {pct}
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-soft overflow-hidden">
                          <div
                            className="h-full bg-ink rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 sm:hidden">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink"
                  >
                    View investor
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
