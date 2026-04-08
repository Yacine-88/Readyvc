"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { ArrowUpDown } from "lucide-react";

// Comparables database - structured market data
const COMPARABLES_DATA = [
  // AFRICA — FINTECH
  { name: "Wave", country: "Senegal", flag: "🇸🇳", geo: "africa", sector: "fintech", stage: "seriesC", raised: 200, valuation: 1700, multiple: null, year: 2021, note: "Mobile money, West Africa" },
  { name: "Flutterwave", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesD", raised: 250, valuation: 3000, multiple: null, year: 2022, note: "Payment infrastructure" },
  { name: "Chipper Cash", country: "Ghana", flag: "🇬🇭", geo: "africa", sector: "fintech", stage: "seriesC", raised: 150, valuation: 2000, multiple: null, year: 2022, note: "Cross-border payments" },
  { name: "OPay", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesC", raised: 400, valuation: 2000, multiple: null, year: 2021, note: "Super-app fintech" },
  { name: "Kuda Bank", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 55, valuation: 500, multiple: null, year: 2021, note: "Neobank" },
  
  // AFRICA — SAAS
  { name: "Yassir", country: "Algeria", flag: "🇩🇿", geo: "africa", sector: "saas", stage: "seriesB", raised: 150, valuation: 700, multiple: 8.5, year: 2023, note: "Super-app, North Africa" },
  { name: "Wasoko", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "saas", stage: "seriesB", raised: 125, valuation: 625, multiple: 7.2, year: 2022, note: "B2B e-commerce SaaS" },
  { name: "TradeDepot", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "saas", stage: "seriesB", raised: 110, valuation: null, multiple: null, year: 2022, note: "B2B trade platform" },
  
  // AFRICA — AGRITECH
  { name: "Twiga Foods", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "agritech", stage: "seriesC", raised: 50, valuation: null, multiple: null, year: 2022, note: "Agricultural supply chain" },
  { name: "Apollo Agriculture", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "agritech", stage: "seriesB", raised: 40, valuation: null, multiple: null, year: 2022, note: "Smallholder farmer fintech" },
  
  // MENA — FINTECH
  { name: "Telr", country: "UAE", flag: "🇦🇪", geo: "mena", sector: "fintech", stage: "seriesB", raised: 100, valuation: 500, multiple: 6.2, year: 2023, note: "Payment gateway MENA" },
  { name: "Hala Pay", country: "Saudi Arabia", flag: "🇸🇦", geo: "mena", sector: "fintech", stage: "seriesA", raised: 25, valuation: 100, multiple: null, year: 2023, note: "Mobile payments KSA" },
  
  // EUROPE — SAAS
  { name: "Payhawk", country: "Bulgaria", flag: "🇧🇬", geo: "europe", sector: "saas", stage: "seriesD", raised: 250, valuation: 1500, multiple: 12.5, year: 2023, note: "B2B spend management" },
  { name: "Wise", country: "UK", flag: "🇬🇧", geo: "europe", sector: "fintech", stage: "ipo", raised: 900, valuation: 13000, multiple: null, year: 2023, note: "Cross-border payments" },
  { name: "Bolt", country: "Estonia", flag: "🇪🇪", geo: "europe", sector: "marketplace", stage: "seriesG", raised: 1200, valuation: 4600, multiple: null, year: 2023, note: "Mobility super-app" },
];

interface Deal {
  name: string;
  country: string;
  flag: string;
  geo: "africa" | "mena" | "europe";
  sector: string;
  stage: string;
  raised: number;
  valuation: number | null;
  multiple: number | null;
  year: number;
  note: string;
}

type SortColumn = "name" | "geo" | "sector" | "stage" | "raised" | "valuation" | "multiple" | "year";

export default function ComparablesPage() {
  const { t } = useI18n();
  const [activeGeo, setActiveGeo] = useState<"all" | "africa" | "mena" | "europe">("all");
  const [activeSector, setActiveSector] = useState<string>("all");
  const [activeStage, setActiveStage] = useState<string>("all");
  const [sortCol, setSortCol] = useState<SortColumn>("valuation");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  // Filter and sort data
  const filtered = useMemo(() => {
    let result = COMPARABLES_DATA.filter((deal: Deal) => {
      const geoMatch = activeGeo === "all" || deal.geo === activeGeo;
      const sectorMatch = activeSector === "all" || deal.sector === activeSector;
      const stageMatch = activeStage === "all" || deal.stage === activeStage;
      return geoMatch && sectorMatch && stageMatch;
    });

    // Sort
    result.sort((a: Deal, b: Deal) => {
      let aVal = a[sortCol as keyof Deal];
      let bVal = b[sortCol as keyof Deal];

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
    if (sortCol === col) {
      setSortDir(sortDir === 1 ? -1 : 1);
    } else {
      setSortCol(col);
      setSortDir(-1);
    }
  };

  // Calculate benchmark metrics
  const benchmarks = useMemo(() => {
    if (filtered.length === 0) return { medianValuation: 0, medianMultiple: 0, avgRaised: 0, medianYear: 0 };

    const valuations = filtered.filter((d: Deal) => d.valuation !== null).map((d: Deal) => d.valuation as number);
    const multiples = filtered.filter((d: Deal) => d.multiple !== null).map((d: Deal) => d.multiple as number);
    const raised = filtered.map((d: Deal) => d.raised);
    const years = filtered.map((d: Deal) => d.year);

    return {
      medianValuation: valuations.length > 0 ? valuations.sort((a, b) => a - b)[Math.floor(valuations.length / 2)] : 0,
      medianMultiple: multiples.length > 0 ? multiples.sort((a, b) => a - b)[Math.floor(multiples.length / 2)] : 0,
      avgRaised: raised.reduce((a, b) => a + b, 0) / raised.length,
      medianYear: years.sort((a, b) => a - b)[Math.floor(years.length / 2)],
    };
  }, [filtered]);

  const stageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      seed: "Seed",
      seriesA: "Series A",
      seriesB: "Series B",
      seriesC: "Series C",
      seriesD: "Series D",
      seriesE: "Series E",
      seriesG: "Series G",
      ipo: "IPO",
    };
    return labels[stage] || stage;
  };

  const geoLabel = (geo: string) => {
    const labels: Record<string, string> = {
      africa: "Africa",
      mena: "MENA",
      europe: "Europe",
    };
    return labels[geo] || geo;
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Page Header */}
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
              A curated database of funding rounds across Africa, MENA, and Europe. Use it to benchmark your valuation, build your comparable analysis, and justify your multiple to investors.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-r border-b border-border md:border-b-0">
              <div className="font-serif text-2xl font-light text-foreground">{COMPARABLES_DATA.length}</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Deals Tracked</div>
            </div>
            <div className="p-4 border-b border-border md:border-b-0">
              <div className="font-serif text-2xl font-light text-foreground">3</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Geographies</div>
            </div>
            <div className="p-4 border-r border-border">
              <div className="font-serif text-2xl font-light text-foreground">8+</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Sectors</div>
            </div>
            <div className="p-4">
              <div className="font-serif text-2xl font-light text-foreground">2026</div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">Last Updated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border bg-background sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-wrap gap-6">
            {/* Geography Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Geography</span>
              <div className="flex gap-2">
                {(["all", "africa", "mena", "europe"] as const).map((geo) => (
                  <button
                    key={geo}
                    onClick={() => setActiveGeo(geo)}
                    className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
                      activeGeo === geo
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {geo === "all" ? "All" : geoLabel(geo)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Sector</span>
              <div className="flex gap-2">
                {(["all", "fintech", "saas", "agritech", "marketplace"] as const).map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setActiveSector(sector)}
                    className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
                      activeSector === sector
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {sector === "all" ? "All" : sector.charAt(0).toUpperCase() + sector.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Stage</span>
              <div className="flex gap-2">
                {(["all", "seed", "seriesA", "seriesB", "seriesC"] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setActiveStage(stage)}
                    className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${
                      activeStage === stage
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {stage === "all" ? "All" : stageLabel(stage)}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="ml-auto flex items-center text-xs font-mono text-muted">
              {filtered.length} deals
            </div>
          </div>
        </div>
      </section>

      {/* Benchmarks */}
      {filtered.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border border-border rounded-lg p-6 bg-surface/50">
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Median Valuation</div>
                <div className="font-mono text-lg font-medium text-foreground">${benchmarks.medianValuation}M</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Median Multiple</div>
                <div className="font-mono text-lg font-medium text-foreground">{benchmarks.medianMultiple.toFixed(1)}x</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Avg Raised</div>
                <div className="font-mono text-lg font-medium text-foreground">${benchmarks.avgRaised.toFixed(0)}M</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Median Year</div>
                <div className="font-mono text-lg font-medium text-foreground">{benchmarks.medianYear}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Table */}
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
                    <th
                      onClick={() => handleSort("name")}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        Company <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("geo")}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        Geo <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("sector")}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        Sector <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("stage")}
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        Stage <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("raised")}
                      className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Raised <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("valuation")}
                      className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Valuation <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("multiple")}
                      className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-2">
                        EV/Rev <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("year")}
                      className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        Year <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
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
                        <span className="text-xs font-medium px-2 py-1 bg-surface rounded">{geoLabel(deal.geo)}</span>
                      </td>
                      <td className="py-3 px-4 text-muted capitalize">{deal.sector}</td>
                      <td className="py-3 px-4 text-muted">{stageLabel(deal.stage)}</td>
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
          <div className="mt-8 p-4 bg-surface/50 rounded border border-border text-xs text-muted leading-relaxed">
            ⚠ Data sourced from public announcements, Crunchbase, and press reports. Valuations and multiples are estimates where not publicly disclosed. This database is for reference only — not financial advice. Last updated April 2026.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-serif font-light mb-2">Build your comparable analysis.</h2>
              <p className="text-sm opacity-80">Book a session to position your valuation against the right benchmarks and build a defensible investor narrative.</p>
            </div>
            <a
              href="https://calendly.com/yacine-chikhar/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-background text-foreground font-medium text-sm rounded hover:bg-surface transition-colors whitespace-nowrap"
            >
              Book your session →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
