"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type {
  InvestorFilterState,
  InvestorSort,
} from "@/lib/investors/ui-types";

interface InvestorFiltersProps {
  value: InvestorFilterState;
  onChange: (next: InvestorFilterState) => void;
  regionOptions?: string[];
  countryOptions?: string[];
  sectorOptions?: string[];
  stageOptions?: string[];
}

const DEFAULT_REGIONS = ["Africa", "MENA", "Europe", "North America", "Asia", "LATAM"];
const DEFAULT_SECTORS = [
  "Fintech",
  "SaaS",
  "AgriTech",
  "Logistics",
  "Energy",
  "HealthTech",
  "EdTech",
  "DeepTech",
  "Marketplace",
  "Retail",
  "CleanTech",
];
const DEFAULT_STAGES = ["Pre-Seed", "Seed", "Series A", "Growth"];

const SORT_OPTIONS: { value: InvestorSort; label: string }[] = [
  { value: "activity_desc", label: "Most active" },
  { value: "deals_desc", label: "Deals (desc)" },
  { value: "name_asc", label: "Name (A–Z)" },
];

const INPUT_CLASS =
  "h-10 w-full rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm text-ink outline-none transition-colors focus:border-ink focus:ring-0";

export function InvestorFilters({
  value,
  onChange,
  regionOptions = DEFAULT_REGIONS,
  countryOptions = [],
  sectorOptions = DEFAULT_SECTORS,
  stageOptions = DEFAULT_STAGES,
}: InvestorFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  function update(patch: Partial<InvestorFilterState>) {
    onChange({ ...value, ...patch, page: 1 });
  }

  function clearAll() {
    onChange({
      ...value,
      search: "",
      region: "",
      country: "",
      sector: "",
      stage: "",
      minActivity: "",
      page: 1,
    });
  }

  const hasActiveFilters =
    !!value.search ||
    !!value.region ||
    !!value.country ||
    !!value.sector ||
    !!value.stage ||
    !!value.minActivity;

  return (
    <div className="bg-card border border-border rounded-[var(--radius-lg)] p-4 md:p-5">
      {/* Row 1: search + sort + mobile expand */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <label htmlFor="investor-search" className="sr-only">
            Search investors
          </label>
          <input
            id="investor-search"
            type="search"
            placeholder="Search investors…"
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="investor-sort" className="sr-only">
            Sort
          </label>
          <select
            id="investor-sort"
            value={value.sort}
            onChange={(e) =>
              update({ sort: e.target.value as InvestorSort })
            }
            className={`${INPUT_CLASS} md:w-44 cursor-pointer`}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={`${INPUT_CLASS} md:hidden w-auto px-4 font-semibold`}
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Filters"}
          </button>
        </div>
      </div>

      {/* Row 2: filter selects (collapsible on mobile) */}
      <div
        className={`mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 ${
          expanded ? "" : "hidden md:grid"
        }`}
      >
        <div>
          <label htmlFor="filter-region" className="sr-only">
            Region
          </label>
          <select
            id="filter-region"
            value={value.region}
            onChange={(e) => update({ region: e.target.value })}
            className={`${INPUT_CLASS} cursor-pointer`}
          >
            <option value="">All regions</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-country" className="sr-only">
            Country
          </label>
          {countryOptions.length > 0 ? (
            <select
              id="filter-country"
              value={value.country}
              onChange={(e) => update({ country: e.target.value })}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="filter-country"
              type="text"
              placeholder="Country"
              value={value.country}
              onChange={(e) => update({ country: e.target.value })}
              className={INPUT_CLASS}
            />
          )}
        </div>

        <div>
          <label htmlFor="filter-sector" className="sr-only">
            Sector
          </label>
          <select
            id="filter-sector"
            value={value.sector}
            onChange={(e) => update({ sector: e.target.value })}
            className={`${INPUT_CLASS} cursor-pointer`}
          >
            <option value="">All sectors</option>
            {sectorOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-stage" className="sr-only">
            Stage
          </label>
          <select
            id="filter-stage"
            value={value.stage}
            onChange={(e) => update({ stage: e.target.value })}
            className={`${INPUT_CLASS} cursor-pointer`}
          >
            <option value="">All stages</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-activity" className="sr-only">
            Min activity
          </label>
          <input
            id="filter-activity"
            type="number"
            min={0}
            placeholder="Min deals"
            value={value.minActivity}
            onChange={(e) => update({ minActivity: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
