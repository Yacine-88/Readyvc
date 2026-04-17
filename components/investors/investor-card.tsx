"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import type { InvestorListRow } from "@/lib/investors/ui-types";

interface InvestorCardProps {
  row: InvestorListRow;
  focusBadges?: string[]; // short tags (inferred focus). Pass in when known.
}

export function InvestorCard({ row, focusBadges = [] }: InvestorCardProps) {
  const location = [row.hq_country, row.hq_region]
    .filter((x): x is string => !!x)
    .join(" · ");
  return (
    <Link
      href={`/investors/${row.id}`}
      className="group block bg-card border border-border rounded-[var(--radius-lg)] p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink truncate">
            {row.investor_name}
          </h3>
          {location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
        <ArrowRight
          className="h-4 w-4 text-muted flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>

      {focusBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {focusBadges.slice(0, 3).map((b) => (
            <span
              key={b}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-soft border border-border text-[10px] font-semibold uppercase tracking-wide text-muted"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide font-semibold text-muted">
          Deals
        </span>
        <span className="font-mono text-sm font-semibold text-ink tabular-nums">
          {row.deal_count}
        </span>
      </div>
    </Link>
  );
}
