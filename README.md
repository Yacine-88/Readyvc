# VC Valuation Tool
### by Yacine CHKHAR

> A free, trilingual startup self-assessment tool using the Venture Capital (VC) valuation method — built for founders in Africa, the Middle East, and francophone markets preparing for fundraising.

🌐 **Live demo:** [yacine-88.github.io/vc-valuation-tool](https://yacine-88.github.io/vc-valuation-tool/vc-valuation-tool.html)

---

## What it does

Founders enter their financial projections and assumptions, and the tool calculates:

- **PV (Present Value)** — what your startup is worth today in the eyes of an investor
- **EV (Enterprise Value)** — valuation at exit using sector-specific revenue multiples
- **IRR (Internal Rate of Return)** — annualized investor return, benchmarked against VC thresholds
- **CoCa (Cash-on-Cash Multiple)** — how many times the investor gets their money back
- **Dilution modeling** — equity stake at entry vs. exit after cumulative dilution
- **3-scenario comparison** — pessimistic / central / optimistic side by side

---

## Features

- **Trilingual** — French 🇫🇷 · English 🇬🇧 · Arabic 🇩🇿 (with full RTL support)
- **26 sectors** with recommended EV/Revenue multiples (sourced from Prof. Damodaran, NYU)
- **85+ countries** organized by region, translated in all 3 languages
- **Founder onboarding form** — collects profile, startup info, team size, ARR, IP/patents
- **Animated financial background** — live candlesticks, stock curves, floating symbols
- **Glassmorphism UI** with dark mode support
- **PDF export** — full report with founder profile and all calculations
- **Methodology guide** — 6-step explanation of the VC method, in all 3 languages
- **Zero dependencies** — single self-contained HTML file, no backend, no framework

---

## How to use

Just open `vc-valuation-tool.html` in any modern browser. No installation, no server needed.

**Hosted version:** upload the file to any static hosting (GitHub Pages, Netlify, Vercel) and share the link.

---

## The VC Method — quick summary

```
EV (Enterprise Value)  = Exit Revenue × EV/Revenue Multiple
Equity Value           = EV − Financial Debt + Cash
PV (Present Value)     = Equity Value ÷ (1 + Required Return)^N years
Exit Equity Stake      = Entry Stake × (1 − Cumulative Dilution)
IRR                    = Annual rate where NPV = 0
CoCa                   = Exit Proceeds ÷ Investment
```

**VC thresholds (rules of thumb):**

| Metric | Difficult | Acceptable | Excellent |
|--------|-----------|------------|-----------|
| IRR    | < 25%     | 25–40%     | ≥ 40%     |
| CoCa   | < 3x      | 3–5x       | ≥ 5x      |

---

## Sector multiples reference

| Sector | Range | Median |
|--------|-------|--------|
| AI & Machine Learning | 8–25x | 14x |
| SaaS | 8–15x | 10x |
| Cybersecurity | 6–15x | 9x |
| Healthtech | 4–12x | 7x |
| Fintech | 5–12x | 7x |
| Edtech | 3–9x | 5x |
| Agritech | 2–7x | 4x |
| E-commerce & Marketplace | 1–4x | 2x |
| Hardware & IoT | 1–4x | 2x |

*Source: Prof. Aswath Damodaran (NYU Stern) — updated annually*

---

## Tech stack

- **Pure HTML/CSS/JS** — zero build step, zero framework
- **Chart.js 4.4** — revenue projection chart
- **Google Fonts** — DM Serif Display, DM Sans, Amiri (Arabic), JetBrains Mono
- **Canvas API** — animated financial background (candlesticks, curves, floating symbols)

---

## Honest data disclaimer

> ⚠️ This tool is only as good as the data you put in. Inflated or inaccurate figures will skew your results and mislead you in front of investors. Use real numbers.

---

## Roadmap

- [ ] Save & share results via unique URL
- [ ] Add DCF (Discounted Cash Flow) method alongside VC method
- [ ] Berkus method for pre-revenue startups
- [ ] Comparable transactions database for African startups
- [ ] API endpoint for embedding in accelerator platforms

---

## Author

**Yacine CHKHAR**
LinkedIn: [linkedin.com/in/yacinechkhar](https://linkedin.com/in/yacinechkhar)

---

## License

Free to use and share. If you build on this, a mention is appreciated.
