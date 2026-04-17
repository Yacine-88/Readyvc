# VCReady
### *Show up ready.*

> The pre-fundraising toolkit for founders worldwide. Free, precise, and built for every founder preparing to raise.

🌐 **Live:** [vcready.co](https://vcready.co) *(or your GitHub Pages URL)*

---

## What is VCReady?

VCReady is a free, open-access toolkit that gives founders every analytical tool they need before walking into an investor meeting. No finance background required. No signup. No cost.

Built by **Yacine CHIKHAR** — founder,and startup ecosystem builder across Africa and MENA.

---

## The Toolkit

| # | Tool | Status | What it does |
|---|---|---|---|
| 01 | **VC Valuation** | ✅ Live | Calculate IRR, EV, CoCa, PV and Investor Score /100 using the Venture Capital method |
| 02 | **Metrics Calculator** | ✅ Live | Sector-specific KPIs — unit economics, runway, growth health with contextual analysis |
| 03 | **Pitch Readiness** | 🔜 Soon | Score your pitch /100 across 6 VC evaluation criteria with actionable feedback |
| 04 | **Data Room Checklist** | 🔜 Soon | 35 documents every investor requests — check readiness, see what's missing |
| 05 | **Cap Table Simulator** | 🔜 Soon | Model dilution across multiple rounds, simulate equity at exit |

---

## Tool 01 — VC Valuation

The core VCReady tool. Uses the **Venture Capital (VC) Method** — the standard used by professional investors at every stage.

**What it calculates:**
- **PV (Present Value)** — what your startup is worth today in the eyes of an investor
- **EV (Enterprise Value)** — valuation at exit using sector-specific revenue multiples
- **IRR (Internal Rate of Return)** — annualized investor return vs. VC thresholds
- **CoCa (Cash-on-Cash Multiple)** — how many times the investor gets their money back
- **Investor Score /100** — 6-criteria attractiveness score with breakdown bars
- **3-scenario comparison** — pessimistic / central / optimistic side by side

**The VC Method formula:**
```
EV (Enterprise Value)  = Exit Revenue × EV/Revenue Multiple
Equity Value           = EV − Financial Debt + Cash
PV (Present Value)     = Equity Value ÷ (1 + Required Return)^N years
IRR                    = Annual rate where NPV = 0
CoCa                   = Exit Proceeds ÷ Investment
```

**VC thresholds:**

| Metric | Difficult | Acceptable | Excellent |
|--------|-----------|------------|-----------|
| IRR | < 25% | 25–40% | ≥ 40% |
| CoCa | < 3x | 3–5x | ≥ 5x |

**Investor Score breakdown:**

| Criteria | Weight |
|---|---|
| IRR | 30 pts |
| CoCa | 20 pts |
| Revenue growth | 20 pts |
| Sector premium | 10 pts |
| Team & stage | 10 pts |
| Scenario consistency | 10 pts |

---

## Tool 02 — Metrics Calculator

Sector-specific KPI calculator. Select your sector, enter your numbers, get an instant investor-grade diagnostic with contextual analysis.

**5 sectors covered:**

| Sector | Key metrics |
|---|---|
| SaaS & Subscription | ARR, CAC, LTV, LTV/CAC, Churn Rate, MRR Growth |
| Marketplace & Commerce | Net Revenue, Gross Margin, AOV, ROAS, Repeat Rate, Take Rate |
| Fintech & Transactional | Net Revenue, ARPU, CAC, MAU, Runway, Burn Rate |
| Deeptech & R&D | Runway, Burn Rate, R&D %, Months to Milestone, Patents, Cash |
| AgriTech & Impact | MRR, ARPU, CAC, LTV/CAC, Churn Rate, Runway |

Each metric includes a status indicator (good / acceptable / needs work), a VC benchmark reference, and a contextual analysis paragraph tailored to the sector and the founder's actual numbers.

---

## Sector Multiples Reference (Tool 01)

| Sector | Range | Median | Source |
|--------|-------|--------|--------|
| AI & Machine Learning | 8–25x | 14x | Damodaran NYU |
| SaaS | 8–15x | 10x | Damodaran NYU |
| Cybersecurity | 6–15x | 9x | Damodaran NYU |
| Healthtech | 4–12x | 7x | Damodaran NYU |
| Fintech | 5–12x | 7x | Damodaran NYU |
| Edtech | 3–9x | 5x | Damodaran NYU |
| AgriTech | 2–7x | 4x | Damodaran NYU |
| E-commerce | 1–4x | 2x | Damodaran NYU |
| Hardware & IoT | 1–4x | 2x | Damodaran NYU |

*Full list of 26 sectors available in the tool.*

---

## Features

- **Bilingual** — English 🇬🇧 and French 🇫🇷
- **Dark mode** — full dark theme support
- **PDF export** — full valuation report download
- **Supabase integration** — founder data collected on form submission
- **Calendly integration** — direct booking link for expert sessions
- **Zero dependencies** — single HTML files, no framework, no build step
- **Mobile responsive** — works on all screen sizes

---

## Tech Stack

- **Pure HTML/CSS/JS** — zero build step, zero framework
- **Chart.js 4.4** — revenue projection chart
- **Google Fonts** — DM Serif Display + DM Sans
- **Supabase** — founder database (REST API, anon key)
- **Resend** — confirmation email on form submission

---

## Roadmap

- [x] VC Valuation Tool
- [x] Metrics Calculator
- [ ] Pitch Readiness Score
- [ ] Data Room Checklist
- [ ] Cap Table Simulator
- [ ] Investor Matching (Africa & MENA funds)
- [ ] Comparable transactions database

---

## Expert Sessions

All tools are free. For founders who want to go deeper — refine their valuation, prepare their data room, or sharpen their investor narrative — book a 30-min working session:

**→ [calendly.com/yacine-chikhar/30min](https://calendly.com/yacine-chikhar/30min)**

---

## Author

**Yacine CHIKHAR**
Startup Ecosystem Explorer 
[yacine.chikhar@gmail.com](mailto:yacine.chikhar@gmail.com)

---

## Investor Intelligence — Data ingestion

VCReady now has a foundation layer for an Investor Intelligence Engine:
clean Supabase tables for investors, deals, yearly activity, and
conservative investor ↔ deal linking, plus idempotent Excel importers.

### Apply the schema

Run the migration in Supabase (SQL editor or CLI):

```
supabase/migrations/0001_create_investor_intelligence.sql
```

Creates: `investors`, `investor_activity_yearly`, `deals`, `deal_investors`,
`import_runs` + indexes + `updated_at` triggers.

### Env vars

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # service-role; server-only; never expose
```

The ingestion scripts use the service-role key so they can bypass RLS.
Keep this key out of client code.

### Run the imports

Drop the workbook at `data/africa-big-deal.xlsx` (the `data/` folder is
gitignored) and run:

```
npx tsx scripts/import-africa-investors.ts
npx tsx scripts/import-africa-deals.ts
```

Run investors first so the deals importer can link deal participants to
known investors by exact normalized name.

### Rerunnability

Both scripts are idempotent:

- `investors` upsert on `(source, normalized_name, website)` with
  `NULLS NOT DISTINCT`, so re-imports update rather than duplicate.
- `investor_activity_yearly` upserts on `(investor_id, activity_year, source)`.
- `deals` upsert on `(source, normalized_company_name, announced_at, round_type)`.
- `deal_investors` upsert on `(deal_id, normalized_investor_name_raw)`.

Every run writes a row to `import_runs` with status, stats, and any
per-row issues (capped at 5000).

### Matching policy (conservative on purpose)

At this stage the deal importer only links a `deal_investors` row to an
`investors` row on **exact normalized name match within the same source**:

- Match → `investor_id` set, `match_confidence = 0.95`, `match_method = 'exact_normalized'`.
- No match → `investor_id` stays null, raw name is preserved in
  `investor_name_raw` + `normalized_investor_name_raw` so a later pass
  (fuzzy / embedding-based) can upgrade the link without re-ingesting.

Wrong merges are worse than missing matches — we never fuzzy-link yet.

### Adapting to new datasets

Column synonyms live in `lib/investors/header-mapping.ts`. When a new
workbook shows up with slightly different headers (e.g. `Startup` vs
`Start-up name`), add an alias to the relevant list — no script changes
required.

---

## Investor Intelligence — Phase 2

Phase 2 adds the matching engine on top of the Phase 1 schema. New migration:

```bash
# Run supabase/migrations/0002_add_matching.sql against your Supabase project
supabase db push   # or paste the SQL into the Supabase SQL editor
```

Two new tables are created:

- `startup_profiles` — founder-side inputs (sectors, stage, geo, fundraising target)
- `investor_matches` — scoring outputs, versioned by `scoring_version` (currently `'v1'`). Unique on `(startup_profile_id, investor_id, scoring_version)` so reruns overwrite their own version but historical versions are preserved.

### Scoring model

Every candidate investor is scored on five dimensions, clamped to `[0, 1]`,
then combined via a fixed weighted sum:

| Dimension    | Weight | What it measures                                                          |
|--------------|--------|---------------------------------------------------------------------------|
| `geo`        | 0.25   | Startup country/region vs investor HQ + explicit geo focus + inferred deal countries |
| `sector`     | 0.25   | Overlap of startup sectors with explicit sector focus + inferred top sectors         |
| `stage`      | 0.20   | Share of investor's recent deals at the startup's canonical stage                    |
| `activity`   | 0.20   | Saturating curve over recent yearly deal counts (recent years weighted heavier)      |
| `check_size` | 0.10   | Fundraising target vs explicit min/max OR typical deal p25–p75 band                  |

When data is missing we return neutral scores (0.3–0.5) rather than zero, so
an investor with unknown sector focus is not automatically ranked below one
with a known mismatch. Reasoning strings are template-driven and grounded:
they only reference facts that exist in the `InvestorContext` for that row.

### Inferred fields

`InvestorContext` is assembled in `lib/investors/inference.ts`. For each
investor we compute:

- `inferred_countries` / `inferred_regions` / `inferred_sectors` — top-5 by
  deal count, derived from linked deals
- `inferred_stages` — histogram over canonical stages (pre-seed / seed /
  series-a / growth / other), via `mapRoundTypeToStage`
- `activity_by_year` — per-year deal counts
- `activity_score_raw` — `1 − exp(−Σ(count × year_weight) / SAT)` with SAT=20
- `typical_check_usd` — p25 / median / p75 over known `amount_raised_usd`

The loader uses at most three batched queries (investors → activity → deal_investors×deals) — never N+1.

### API endpoints

All endpoints run on the Node runtime and return `{ ok, data?, error? }`.

```bash
# List investors (filters: search, region, country, sector, stage, minActivity)
curl 'http://localhost:3000/api/investors?country=Nigeria&sector=fintech&page=1&pageSize=25'

# Single investor detail (profile + yearly activity + recent deals + inferred fields)
curl 'http://localhost:3000/api/investors/<investor-id>'

# Create a startup profile
curl -X POST http://localhost:3000/api/startup-profiles \
  -H 'content-type: application/json' \
  -d '{
    "startup_name": "Acme",
    "country": "Nigeria",
    "region": "West Africa",
    "stage": "Seed",
    "sectors": ["fintech"],
    "fundraising_target_usd": 2000000
  }'

# Fetch a startup profile
curl 'http://localhost:3000/api/startup-profiles/<profile-id>'

# Run matching (persisted when startup_profile_id is provided)
curl -X POST http://localhost:3000/api/matching/run \
  -H 'content-type: application/json' \
  -d '{"startup_profile_id": "<profile-id>", "topK": 50}'

# Preview matching without saving (use a raw profile body instead)
curl -X POST http://localhost:3000/api/matching/run \
  -H 'content-type: application/json' \
  -d '{"profile": {"startup_name":"Acme","country":"Nigeria","stage":"Seed","sectors":["fintech"]}, "topK": 20}'

# Fetch latest saved matches for a profile
curl 'http://localhost:3000/api/matching/<profile-id>'
```

`scoring_version` is currently `'v1'`. Future scoring tweaks should bump the
version rather than overwrite history, so older saved matches remain
reproducible and comparable.

---

## License

Free to use and share. If you build on this, a mention is appreciated.
