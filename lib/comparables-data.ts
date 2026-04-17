/**
 * comparables-data.ts
 *
 * Shared dataset for the /comparables page and the dashboard
 * "You vs Market" benchmark block.
 *
 * Import COMPARABLES_DATA anywhere — pure data, no React.
 */

export interface Deal {
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

export const COMPARABLES_DATA: Deal[] = [

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
