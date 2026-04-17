"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { ArrowUpDown, TrendingUp, Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { computeBenchmark } from "@/lib/benchmark-engine";
import { type Deal, COMPARABLES_DATA } from "@/lib/comparables-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortColumn = "name" | "geo" | "sector" | "stage" | "raised" | "valuation" | "multiple" | "year";

function fmtM(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1)    return `$${Math.round(v)}M`;
  return `$${(v * 1000).toFixed(0)}K`;
}

const STAGE_LABELS: Record<string, string> = {
  preSeed: "Pre-Seed",
  seed: "Seed",
  seriesA: "Series A",
  seriesB: "Series B",
  seriesC: "Series C",
  seriesD: "Series D",
  seriesE: "Series E",
  seriesG: "Series G",
  ventureRound: "Venture",
  ipo: "IPO",
};

const GEO_LABELS: Record<string, string> = {
  africa: "Africa",
  mena: "MENA",
  europe: "Europe",
};

const SECTOR_LABELS: Record<string, string> = {
  fintech: "Fintech",
  saas: "SaaS",
  agritech: "AgriTech",
  logistics: "Logistics",
  energy: "Energy",
  deeptech: "DeepTech",
  edtech: "EdTech",
  healthtech: "HealthTech",
  retail: "Retail",
  marketplace: "Marketplace",
  travel: "Travel",
  telecom: "Telecom",
  cleantech: "CleanTech",
};

const ALL_SECTORS = [
  "all", "fintech", "saas", "logistics", "energy", "agritech",
  "healthtech", "deeptech", "retail", "edtech", "marketplace", "travel", "telecom", "cleantech",
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

import type { BenchmarkResult } from "@/lib/benchmark-engine";

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface/60 p-4">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-base font-semibold text-foreground leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

const CONFIDENCE_CONFIG = {
  high:   { label: "High confidence",   icon: CheckCircle2,   cls: "text-success bg-success/10 border-success/20" },
  medium: { label: "Medium confidence", icon: AlertTriangle,  cls: "text-warning bg-warning/10 border-warning/20" },
  low:    { label: "Low confidence",    icon: AlertCircle,    cls: "text-danger  bg-danger/10  border-danger/20"  },
} as const;

const SECTOR_LABEL_MAP: Record<string, string> = {
  fintech: "Fintech", saas: "SaaS", agritech: "AgriTech", logistics: "Logistics",
  energy: "Energy", deeptech: "DeepTech", edtech: "EdTech", healthtech: "HealthTech",
  retail: "Retail", marketplace: "Marketplace", travel: "Travel", telecom: "Telecom",
  cleantech: "CleanTech",
};

const STAGE_LABEL_MAP: Record<string, string> = {
  preSeed: "Pre-Seed", seed: "Seed", seriesA: "Series A", seriesB: "Series B",
  seriesC: "Series C", seriesD: "Series D", seriesE: "Series E", seriesG: "Series G",
  ventureRound: "Venture", ipo: "IPO",
};

function BenchmarkIntelligence({ bm }: { bm: BenchmarkResult }) {
  const conf = CONFIDENCE_CONFIG[bm.confidence];
  const ConfIcon = conf.icon;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-surface/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Benchmark Intelligence</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold ${conf.cls}`}>
          <ConfIcon className="w-3 h-3" />
          {conf.label}
        </span>
      </div>

      <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">

        {/* Left: insights list (3 cols) */}
        <div className="md:col-span-3 px-5 py-4 space-y-2">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Market Insights</p>
          {bm.insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary leading-snug">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0" />
              {ins}
            </div>
          ))}
          <p className="text-[11px] text-muted pt-1 border-t border-border/50 mt-3">
            <Info className="w-3 h-3 inline mr-1 opacity-60" />
            {bm.confidenceReason}
          </p>
        </div>

        {/* Right: quick stats (2 cols) */}
        <div className="md:col-span-2 px-5 py-4">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Peer Set Breakdown</p>
          <div className="space-y-3">
            {/* Top sectors mini-bars */}
            <div>
              <p className="text-[10px] text-muted mb-1.5 font-medium">Top sectors</p>
              <div className="space-y-1.5">
                {bm.sectorBreakdown.slice(0, 4).map((s) => (
                  <div key={s.sector} className="flex items-center gap-2">
                    <div className="w-20 shrink-0 text-[11px] text-muted truncate">
                      {SECTOR_LABEL_MAP[s.sector] ?? s.sector}
                    </div>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent/70 rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="w-7 text-right text-[11px] font-mono text-muted shrink-0">{s.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top stages mini-bars */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted mb-1.5 font-medium">Top stages</p>
              <div className="space-y-1.5">
                {bm.stageBreakdown.slice(0, 4).map((s) => (
                  <div key={s.sector} className="flex items-center gap-2">
                    <div className="w-20 shrink-0 text-[11px] text-muted truncate">
                      {STAGE_LABEL_MAP[s.sector] ?? s.sector}
                    </div>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/30 rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="w-7 text-right text-[11px] font-mono text-muted shrink-0">{s.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="pt-2 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[11px] text-muted">{bm.countriesCount} countr{bm.countriesCount === 1 ? "y" : "ies"}</span>
              <span className="text-[11px] text-muted">{bm.sectorsCount} sector{bm.sectorsCount === 1 ? "" : "s"}</span>
              {bm.yearRange[0] > 0 && (
                <span className="text-[11px] text-muted">{bm.yearRange[0]}–{bm.yearRange[1]}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparablesPage() {
  const { t } = useI18n();
  const [activeGeo, setActiveGeo] = useState<"all" | "africa" | "mena" | "europe">("all");
  const [activeSector, setActiveSector] = useState<string>("all");
  const [activeStage, setActiveStage] = useState<string>("all");
  const [sortCol, setSortCol] = useState<SortColumn>("valuation");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const filtered = useMemo(() => {
    const result = COMPARABLES_DATA.filter((deal) => {
      const geoMatch    = activeGeo    === "all" || deal.geo    === activeGeo;
      const sectorMatch = activeSector === "all" || deal.sector === activeSector;
      const stageMatch  = activeStage  === "all" || deal.stage  === activeStage;
      return geoMatch && sectorMatch && stageMatch;
    });

    result.sort((a, b) => {
      let aVal: string | number | null = a[sortCol as keyof Deal] as string | number | null;
      let bVal: string | number | null = b[sortCol as keyof Deal] as string | number | null;
      if (aVal === null || aVal === undefined) aVal = 0;
      if (bVal === null || bVal === undefined) bVal = 0;
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 1 ? 1 : -1;
      if (aVal > bVal) return sortDir === 1 ? -1 : 1;
      return 0;
    });

    return result;
  }, [activeGeo, activeSector, activeStage, sortCol, sortDir]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) setSortDir(sortDir === 1 ? -1 : 1);
    else { setSortCol(col); setSortDir(-1); }
  };

  const bm = useMemo(() => computeBenchmark(filtered), [filtered]);

  // Counts for the header stats
  const sectorCount = new Set(COMPARABLES_DATA.map((d) => d.sector)).size;
  const countryCount = new Set(COMPARABLES_DATA.map((d) => d.country)).size;
  const enrichedCount = COMPARABLES_DATA.filter((d) => d.source === "africa_big_deal").length;

  return (
    <div className="bg-background">

      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-muted uppercase mb-3">
              Sector Comparables
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-light text-foreground mb-4 leading-tight">
              Know where you stand.
            </h1>
            <p className="text-base text-muted max-w-2xl leading-relaxed">
              A curated database of funding rounds across Africa, MENA, and Europe — sourced from public
              announcements, Crunchbase, press releases, and proprietary market research (2019–2025).
              Benchmark your valuation, build your comps analysis, and justify your multiple to investors.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-r border-b border-border md:border-b-0">
              <div className="font-serif text-2xl font-light text-foreground">{COMPARABLES_DATA.length}</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Deals Tracked</div>
            </div>
            <div className="p-4 border-b border-border md:border-b-0 md:border-r">
              <div className="font-serif text-2xl font-light text-foreground">{countryCount}</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Countries</div>
            </div>
            <div className="p-4 border-r border-border">
              <div className="font-serif text-2xl font-light text-foreground">{sectorCount}</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Sectors</div>
            </div>
            <div className="p-4">
              <div className="font-serif text-2xl font-light text-foreground">2019–26</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <section className="border-b border-border bg-background sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4">

            {/* Geography */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">Geo</span>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "africa", "mena", "europe"] as const).map((geo) => (
                  <button key={geo} onClick={() => setActiveGeo(geo)}
                    className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
                      activeGeo === geo
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {geo === "all" ? "All" : GEO_LABELS[geo]}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">Sector</span>
              <div className="flex gap-1.5 flex-wrap">
                {ALL_SECTORS.map((sector) => (
                  <button key={sector} onClick={() => setActiveSector(sector)}
                    className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
                      activeSector === sector
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {sector === "all" ? "All" : (SECTOR_LABELS[sector] ?? sector)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">Stage</span>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "preSeed", "seed", "seriesA", "ventureRound", "seriesB", "seriesC", "seriesD"] as const).map((stage) => (
                  <button key={stage} onClick={() => setActiveStage(stage)}
                    className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
                      activeStage === stage
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {stage === "all" ? "All" : STAGE_LABELS[stage]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto flex items-center text-xs font-mono text-muted self-center">
              {filtered.length} deals
            </div>
          </div>
        </div>
      </section>

      {/* ── Benchmark summary row ────────────────────────────────── */}
      {filtered.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">

            {/* 4-stat summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px border border-border rounded-lg overflow-hidden bg-border">
              <StatCell label="Median Valuation"
                value={bm.medianValuation !== null ? fmtM(bm.medianValuation) : "—"}
                sub={bm.valuationCoverage > 0 ? `${bm.valuationCoverage}% coverage` : "no data"} />
              <StatCell label="Median EV / Rev"
                value={bm.medianMultiple !== null ? `${bm.medianMultiple.toFixed(1)}x` : "—"}
                sub={bm.multipleCoverage > 0 ? `${bm.multipleCoverage}% coverage` : "no data"} />
              <StatCell label="Median Raised"
                value={fmtM(bm.medianRaised)}
                sub={`avg ${fmtM(bm.avgRaised)}`} />
              <StatCell label="Raised Range (P25–P75)"
                value={bm.raisedBracket}
                sub={`${bm.peerCount} peers`} />
            </div>

            {/* Intelligence panel */}
            <BenchmarkIntelligence bm={bm} />
          </div>
        </section>
      )}

      {/* ── Table ────────────────────────────────────────────────── */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted border border-dashed border-border rounded-lg">
              <p>No deals match your filters. Try adjusting them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    {(
                      [
                        { col: "name",      label: "Company",    align: "left"   },
                        { col: "geo",       label: "Geo",        align: "left"   },
                        { col: "sector",    label: "Sector",     align: "left"   },
                        { col: "stage",     label: "Stage",      align: "left"   },
                        { col: "raised",    label: "Raised",     align: "right"  },
                        { col: "valuation", label: "Valuation",  align: "right"  },
                        { col: "multiple",  label: "EV/Rev",     align: "right"  },
                        { col: "year",      label: "Year",       align: "center" },
                      ] as { col: SortColumn; label: string; align: string }[]
                    ).map(({ col, label, align }) => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground text-${align}`}
                      >
                        <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>
                          {label} <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{deal.flag}</span>
                          <div>
                            <div className="font-medium text-foreground">{deal.name}</div>
                            <div className="text-xs text-muted">{deal.note}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 bg-surface rounded">{GEO_LABELS[deal.geo]}</span>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {SECTOR_LABELS[deal.sector] ?? deal.sector}
                      </td>
                      <td className="py-3 px-4 text-muted">{STAGE_LABELS[deal.stage] ?? deal.stage}</td>
                      <td className="py-3 px-4 text-right font-mono">${deal.raised}M</td>
                      <td className="py-3 px-4 text-right font-mono">{deal.valuation ? `$${deal.valuation}M` : "—"}</td>
                      <td className="py-3 px-4 text-right font-mono">{deal.multiple ? `${deal.multiple.toFixed(1)}x` : "—"}</td>
                      <td className="py-3 px-4 text-center font-mono text-muted text-xs">{deal.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-surface/50 rounded border border-border text-xs text-muted leading-relaxed space-y-1">
            <p>
              ⚠ Data sourced from public investment announcements, Crunchbase, press releases, and proprietary market research (2019–2025).
              {" "}Valuations and multiples are estimates where not publicly disclosed.
              {" "}{enrichedCount} of {COMPARABLES_DATA.length} records include enriched valuation and multiple data.
            </p>
            <p>This database is for reference only — not financial advice. Last updated April 2026.</p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-foreground text-background py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-serif font-light mb-2">Build your comparable analysis.</h2>
              <p className="text-sm opacity-80">
                Book a session to position your valuation against the right benchmarks and build a defensible investor narrative.
              </p>
            </div>
            <a
              href="https://calendly.com/vcready/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-background text-foreground font-medium text-sm rounded hover:bg-surface transition-colors whitespace-nowrap"
            >
              Book your session →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
