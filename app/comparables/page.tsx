"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { ArrowUpDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** "vcready" = hand-curated by VCReady team (primary, authoritative)
   *  "africa_big_deal" = sourced from Africa: The Big Deal database 2019–2023 */
  source: "vcready" | "africa_big_deal";
}

// ─── Dataset ──────────────────────────────────────────────────────────────────
// Merge strategy:
//   1. All VCReady original records kept verbatim (source: "vcready")
//   2. Africa: The Big Deal records added only where no VCReady equivalent exists
//   3. Duplicates resolved in favour of VCReady version
//   4. New sectors added: logistics, energy, deeptech, edtech, healthtech, retail, telecom

const COMPARABLES_DATA: Deal[] = [

  // ══════════════════════════════════════════════════════════════
  // VCREADY ORIGINALS — preserved exactly as-is
  // ══════════════════════════════════════════════════════════════

  // AFRICA — FINTECH
  { name: "Wave", country: "Senegal", flag: "🇸🇳", geo: "africa", sector: "fintech", stage: "seriesC", raised: 200, valuation: 1700, multiple: null, year: 2021, note: "Mobile money, West Africa", source: "vcready" },
  { name: "Flutterwave", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesD", raised: 250, valuation: 3000, multiple: null, year: 2022, note: "Payment infrastructure", source: "vcready" },
  { name: "Chipper Cash", country: "Ghana", flag: "🇬🇭", geo: "africa", sector: "fintech", stage: "seriesC", raised: 150, valuation: 2000, multiple: null, year: 2022, note: "Cross-border payments", source: "vcready" },
  { name: "OPay", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesC", raised: 400, valuation: 2000, multiple: null, year: 2021, note: "Super-app fintech", source: "vcready" },
  { name: "Kuda Bank", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 55, valuation: 500, multiple: null, year: 2021, note: "Neobank", source: "vcready" },

  // AFRICA — SAAS
  { name: "Yassir", country: "Algeria", flag: "🇩🇿", geo: "africa", sector: "saas", stage: "seriesB", raised: 150, valuation: 700, multiple: 8.5, year: 2023, note: "Super-app, Algeria", source: "vcready" },
  { name: "Wasoko", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "saas", stage: "seriesB", raised: 125, valuation: 625, multiple: 7.2, year: 2022, note: "B2B e-commerce SaaS", source: "vcready" },
  { name: "TradeDepot", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "saas", stage: "seriesB", raised: 110, valuation: null, multiple: null, year: 2022, note: "B2B trade platform", source: "vcready" },

  // AFRICA — AGRITECH
  { name: "Twiga Foods", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "agritech", stage: "seriesC", raised: 50, valuation: null, multiple: null, year: 2022, note: "Agricultural supply chain", source: "vcready" },
  { name: "Apollo Agriculture", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "agritech", stage: "seriesB", raised: 40, valuation: null, multiple: null, year: 2022, note: "Smallholder farmer fintech", source: "vcready" },

  // MENA — FINTECH
  { name: "Telr", country: "UAE", flag: "🇦🇪", geo: "mena", sector: "fintech", stage: "seriesB", raised: 100, valuation: 500, multiple: 6.2, year: 2023, note: "Payment gateway MENA", source: "vcready" },
  { name: "Hala Pay", country: "Saudi Arabia", flag: "🇸🇦", geo: "mena", sector: "fintech", stage: "seriesA", raised: 25, valuation: 100, multiple: null, year: 2023, note: "Mobile payments KSA", source: "vcready" },

  // EUROPE
  { name: "Payhawk", country: "Bulgaria", flag: "🇧🇬", geo: "europe", sector: "saas", stage: "seriesD", raised: 250, valuation: 1500, multiple: 12.5, year: 2023, note: "B2B spend management", source: "vcready" },
  { name: "Wise", country: "UK", flag: "🇬🇧", geo: "europe", sector: "fintech", stage: "ipo", raised: 900, valuation: 13000, multiple: null, year: 2023, note: "Cross-border payments", source: "vcready" },
  { name: "Bolt", country: "Estonia", flag: "🇪🇪", geo: "europe", sector: "marketplace", stage: "seriesG", raised: 1200, valuation: 4600, multiple: null, year: 2023, note: "Mobility super-app", source: "vcready" },

  // AFRICA — 2026 (VCReady proprietary)
  { name: "Qareeb", country: "Algeria", flag: "🇩🇿", geo: "africa", sector: "agritech", stage: "seed", raised: 2, valuation: null, multiple: null, year: 2026, note: "AgriTech, Algeria", source: "vcready" },
  { name: "Volz", country: "Algeria", flag: "🇩🇿", geo: "africa", sector: "travel", stage: "seriesA", raised: 5, valuation: null, multiple: null, year: 2026, note: "Travel Tech, Algeria", source: "vcready" },

  // ══════════════════════════════════════════════════════════════
  // ENRICHMENT — Africa: The Big Deal (2019–2023)
  // Added only where no VCReady record exists for the same company.
  // ══════════════════════════════════════════════════════════════

  // — FINTECH (Africa) ——————————————————————————————————————————
  { name: "MNT-Halan", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "fintech", stage: "ventureRound", raised: 260, valuation: 1000, multiple: null, year: 2023, note: "Embedded finance & BNPL", source: "africa_big_deal" },
  { name: "Interswitch", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "ventureRound", raised: 200, valuation: null, multiple: null, year: 2019, note: "Payment infrastructure pioneer", source: "africa_big_deal" },
  { name: "Andela", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "edtech", stage: "seriesE", raised: 200, valuation: 1500, multiple: null, year: 2021, note: "Tech talent network", source: "africa_big_deal" },
  { name: "Jumo", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "ventureRound", raised: 120, valuation: 400, multiple: null, year: 2021, note: "Digital credit platform", source: "africa_big_deal" },
  { name: "TymeBank", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesB", raised: 109, valuation: null, multiple: null, year: 2021, note: "Digital bank, South Africa", source: "africa_big_deal" },
  { name: "Clickatell", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "telecom", stage: "seriesC", raised: 91, valuation: null, multiple: null, year: 2022, note: "Chat commerce platform", source: "africa_big_deal" },
  { name: "PalmPay", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "ventureRound", raised: 100, valuation: null, multiple: null, year: 2021, note: "Mobile payments Nigeria", source: "africa_big_deal" },
  { name: "MFS Africa", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesC", raised: 100, valuation: null, multiple: null, year: 2022, note: "Pan-African payments network", source: "africa_big_deal" },
  { name: "Gro Intelligence", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "deeptech", stage: "seriesB", raised: 85, valuation: null, multiple: null, year: 2021, note: "Agricultural intelligence AI", source: "africa_big_deal" },
  { name: "Yoco", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesC", raised: 83, valuation: null, multiple: null, year: 2021, note: "SME payments & POS", source: "africa_big_deal" },
  { name: "Ozow", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesB", raised: 48, valuation: null, multiple: null, year: 2021, note: "Instant EFT payments", source: "africa_big_deal" },
  { name: "Paymob", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 50, valuation: null, multiple: null, year: 2022, note: "Payment gateway MENA/Africa", source: "africa_big_deal" },
  { name: "Moniepoint", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesC", raised: 50, valuation: null, multiple: null, year: 2022, note: "Business banking platform", source: "africa_big_deal" },
  { name: "Valr", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesB", raised: 50, valuation: 240, multiple: null, year: 2022, note: "Crypto exchange", source: "africa_big_deal" },
  { name: "FairMoney", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 42, valuation: null, multiple: null, year: 2021, note: "Digital lending neobank", source: "africa_big_deal" },
  { name: "Yellow Card", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 40, valuation: null, multiple: null, year: 2022, note: "Crypto on-ramp Africa", source: "africa_big_deal" },
  { name: "Khazna", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "fintech", stage: "seriesA", raised: 38, valuation: null, multiple: null, year: 2022, note: "Financial super-app Egypt", source: "africa_big_deal" },
  { name: "LemFi", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesA", raised: 33, valuation: null, multiple: null, year: 2023, note: "Remittances for diaspora", source: "africa_big_deal" },
  { name: "Nomba", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "fintech", stage: "seriesB", raised: 30, valuation: 150, multiple: null, year: 2023, note: "Business payments & POS", source: "africa_big_deal" },
  { name: "Stitch", country: "South Africa", flag: "🇿🇦", geo: "africa", sector: "fintech", stage: "seriesA", raised: 21, valuation: null, multiple: null, year: 2022, note: "Open banking API", source: "africa_big_deal" },

  // — LOGISTICS ——————————————————————————————————————————————————
  { name: "Swvl", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "logistics", stage: "seriesC", raised: 68, valuation: null, multiple: null, year: 2019, note: "Mass transit tech", source: "africa_big_deal" },
  { name: "Moove", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "logistics", stage: "seriesB", raised: 65, valuation: null, multiple: null, year: 2022, note: "Vehicle financing platform", source: "africa_big_deal" },
  { name: "Kobo360", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "logistics", stage: "seriesB", raised: 48, valuation: null, multiple: null, year: 2021, note: "Freight logistics platform", source: "africa_big_deal" },
  { name: "Trella", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "logistics", stage: "seriesA", raised: 42, valuation: null, multiple: null, year: 2021, note: "Trucking marketplace", source: "africa_big_deal" },
  { name: "Sabi", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "logistics", stage: "seriesB", raised: 38, valuation: 300, multiple: null, year: 2023, note: "B2B commerce network", source: "africa_big_deal" },

  // — ENERGY ——————————————————————————————————————————————————————
  { name: "Sun King", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "energy", stage: "seriesD", raised: 260, valuation: null, multiple: null, year: 2022, note: "Solar for off-grid homes", source: "africa_big_deal" },
  { name: "Zola Electric", country: "Tanzania", flag: "🇹🇿", geo: "africa", sector: "energy", stage: "ventureRound", raised: 90, valuation: null, multiple: null, year: 2021, note: "Solar + storage, East Africa", source: "africa_big_deal" },
  { name: "M-Kopa", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "energy", stage: "ventureRound", raised: 75, valuation: null, multiple: null, year: 2022, note: "Asset finance & solar", source: "africa_big_deal" },
  { name: "Bboxx", country: "Africa", flag: "🌍", geo: "africa", sector: "energy", stage: "seriesD", raised: 50, valuation: null, multiple: null, year: 2019, note: "Off-grid solar pan-Africa", source: "africa_big_deal" },
  { name: "Nuru", country: "DRC", flag: "🇨🇩", geo: "africa", sector: "energy", stage: "seriesB", raised: 40, valuation: null, multiple: null, year: 2023, note: "Solar mini-grids, DRC", source: "africa_big_deal" },

  // — DEEPTECH ———————————————————————————————————————————————————
  { name: "Instadeep", country: "Tunisia", flag: "🇹🇳", geo: "africa", sector: "deeptech", stage: "seriesB", raised: 100, valuation: null, multiple: null, year: 2022, note: "AI decision-making platform", source: "africa_big_deal" },
  { name: "Instabug", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "deeptech", stage: "seriesB", raised: 46, valuation: null, multiple: null, year: 2022, note: "Mobile app testing platform", source: "africa_big_deal" },

  // — HEALTHTECH ——————————————————————————————————————————————————
  { name: "Vezeeta", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "healthtech", stage: "seriesD", raised: 40, valuation: 125, multiple: null, year: 2020, note: "Digital health marketplace", source: "africa_big_deal" },
  { name: "mPharma", country: "Ghana", flag: "🇬🇭", geo: "africa", sector: "healthtech", stage: "seriesD", raised: 35, valuation: null, multiple: null, year: 2022, note: "Pharmaceutical supply chain", source: "africa_big_deal" },
  { name: "Helium Health", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "healthtech", stage: "seriesB", raised: 30, valuation: null, multiple: null, year: 2023, note: "Hospital management SaaS", source: "africa_big_deal" },
  { name: "54gene", country: "Nigeria", flag: "🇳🇬", geo: "africa", sector: "healthtech", stage: "seriesB", raised: 25, valuation: null, multiple: null, year: 2021, note: "Genomics research, Africa", source: "africa_big_deal" },

  // — AGRITECH (enrichment) ————————————————————————————————————
  { name: "Victory Farms", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "agritech", stage: "seriesB", raised: 35, valuation: null, multiple: null, year: 2023, note: "Fish farming, East Africa", source: "africa_big_deal" },

  // — RETAIL ———————————————————————————————————————————————————
  { name: "Copia", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "retail", stage: "seriesC", raised: 50, valuation: null, multiple: null, year: 2022, note: "Last-mile e-commerce", source: "africa_big_deal" },
  { name: "MaxAB", country: "Egypt", flag: "🇪🇬", geo: "africa", sector: "retail", stage: "seriesA", raised: 40, valuation: null, multiple: null, year: 2021, note: "B2B food & grocery platform", source: "africa_big_deal" },

  // — TELECOM ——————————————————————————————————————————————————
  { name: "Poa Internet", country: "Kenya", flag: "🇰🇪", geo: "africa", sector: "telecom", stage: "seriesC", raised: 28, valuation: null, multiple: null, year: 2022, note: "Rural internet access", source: "africa_big_deal" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortColumn = "name" | "geo" | "sector" | "stage" | "raised" | "valuation" | "multiple" | "year";

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
  "healthtech", "deeptech", "retail", "edtech", "marketplace", "travel", "telecom",
] as const;

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

  const benchmarks = useMemo(() => {
    if (filtered.length === 0) return { medianValuation: 0, medianMultiple: 0, avgRaised: 0, medianYear: 0 };
    const valuations = filtered.filter((d) => d.valuation !== null).map((d) => d.valuation as number).sort((a, b) => a - b);
    const multiples  = filtered.filter((d) => d.multiple  !== null).map((d) => d.multiple  as number).sort((a, b) => a - b);
    const raised     = filtered.map((d) => d.raised);
    const years      = filtered.map((d) => d.year).sort((a, b) => a - b);
    return {
      medianValuation: valuations.length > 0 ? valuations[Math.floor(valuations.length / 2)] : 0,
      medianMultiple:  multiples.length  > 0 ? multiples [Math.floor(multiples.length  / 2)] : 0,
      avgRaised:       raised.reduce((a, b) => a + b, 0) / raised.length,
      medianYear:      years[Math.floor(years.length / 2)],
    };
  }, [filtered]);

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
              A curated database of funding rounds across Africa, MENA, and Europe — enriched with{" "}
              <span className="text-foreground font-medium">Africa: The Big Deal</span> data (2019–2023).
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
                {(["all", "seed", "seriesA", "seriesB", "seriesC", "seriesD"] as const).map((stage) => (
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

      {/* ── Benchmarks ──────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border border-border rounded-lg p-6 bg-surface/50">
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Median Valuation</div>
                <div className="font-mono text-lg font-medium text-foreground">
                  {benchmarks.medianValuation > 0 ? `$${benchmarks.medianValuation}M` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Median EV/Rev</div>
                <div className="font-mono text-lg font-medium text-foreground">
                  {benchmarks.medianMultiple > 0 ? `${benchmarks.medianMultiple.toFixed(1)}x` : "—"}
                </div>
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
              ⚠ Data sourced from public announcements, Crunchbase, press reports, and{" "}
              <span className="font-medium text-foreground">Africa: The Big Deal</span> database (2019–2023).
              {" "}Valuations and multiples are estimates where not publicly disclosed.
              {" "}{enrichedCount} of {COMPARABLES_DATA.length} records enriched from Africa: The Big Deal.
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
