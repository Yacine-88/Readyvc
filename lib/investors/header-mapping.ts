/**
 * Header-mapping layer for Excel ingestion.
 *
 * Different vendors / years use slightly different column labels. Instead of
 * hard-coding header strings inside the import scripts, we declare header
 * synonym lists here and resolve them case/whitespace-insensitively. That way
 * when a new dataset shows up with "Startup" instead of "Start-up name", we
 * just append an alias and move on.
 */

export type HeaderAliasMap<K extends string> = Record<K, readonly string[]>;

/** Returns a lowercased, whitespace-collapsed form for matching. */
function canon(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Build a canonical-header → column-index map for a given row of raw headers.
 * Each logical key maps to the first column whose header matches any alias.
 */
export function resolveHeaders<K extends string>(
  headerRow: unknown[],
  aliases: HeaderAliasMap<K>
): Partial<Record<K, number>> {
  const canonicalHeader = headerRow.map((h) =>
    h == null ? "" : canon(String(h))
  );

  const out: Partial<Record<K, number>> = {};
  for (const key of Object.keys(aliases) as K[]) {
    const candidates = aliases[key].map(canon);
    const idx = canonicalHeader.findIndex((h) => candidates.includes(h));
    if (idx >= 0) out[key] = idx;
  }
  return out;
}

// -- Investors sheet -------------------------------------------------------

export type InvestorCol =
  | "investor"
  | "hq"
  | "hq_region"
  | "website"
  | "deals_total"
  | "deals_2019"
  | "deals_2020"
  | "deals_2021"
  | "deals_2022"
  | "deals_2023";

export const INVESTOR_HEADER_ALIASES: HeaderAliasMap<InvestorCol> = {
  investor: ["Investor", "Investor Name", "Fund", "Fund Name"],
  hq: ["HQ", "Headquarters", "HQ Country", "Country"],
  hq_region: ["HQ Region", "Region", "Continent"],
  website: ["Website", "URL", "Web", "Site"],
  deals_total: ["2019-23 deals", "Total deals", "Deals"],
  deals_2019: [
    "2019 deals ($1M+)",
    "2019 deals",
    "Deals 2019",
    "2019",
  ],
  deals_2020: [
    "2020 deals ($500K+)",
    "2020 deals",
    "Deals 2020",
    "2020",
  ],
  deals_2021: [
    "2021 deals ($100K+)",
    "2021 deals",
    "Deals 2021",
    "2021",
  ],
  deals_2022: [
    "2022 deals ($100K+)",
    "2022 deals",
    "Deals 2022",
    "2022",
  ],
  deals_2023: [
    "2023 deals ($100K+)",
    "2023 deals",
    "Deals 2023",
    "2023",
  ],
};

// -- Deals sheet -----------------------------------------------------------

export type DealCol =
  | "deal_year"
  | "deal_date"
  | "company_name"
  | "website"
  | "country"
  | "region"
  | "launch_year"
  | "description"
  | "sector"
  | "amount_disclosure"
  | "amount_raised_m"
  | "comment"
  | "bracket"
  | "round_type"
  | "exit"
  | "valuation_m"
  | "first_m"
  | "link_news"
  | "investors";

export const DEAL_HEADER_ALIASES: HeaderAliasMap<DealCol> = {
  deal_year: ["Deal Year", "Year"],
  deal_date: ["Deal Date", "Date", "Announced", "Announcement Date"],
  company_name: ["Start-up name", "Startup name", "Startup", "Company", "Company Name"],
  website: ["Website", "URL"],
  country: ["Country"],
  region: ["Region"],
  launch_year: ["Launch", "Launch Year", "Founded"],
  description: ["Description"],
  sector: ["Sector", "Industry"],
  amount_disclosure: ["Amount disclosure"],
  amount_raised_m: ["Amount raised $M", "Amount $M", "Amount raised", "Amount"],
  comment: ["Comment", "Notes"],
  bracket: ["Bracket"],
  round_type: ["Type", "Round", "Round Type", "Stage"],
  exit: ["Exit"],
  valuation_m: ["Valuation $M", "Valuation"],
  first_m: ["1st $M ?", "1st $M", "First $M"],
  link_news: ["Link to news", "Link", "Source URL"],
  investors: ["Investors", "Investor"],
};
