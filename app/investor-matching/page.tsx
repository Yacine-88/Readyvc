import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/section";

export const metadata = {
  title: "Investor Matching | VCReady",
  description:
    "Identify the investors most likely to fit your company — ranked by geography, sector, stage, and real deal activity.",
};

const STEPS = [
  {
    n: "01",
    title: "Profile",
    body: "Tell us about your company — stage, sectors, geography, and fundraising target.",
  },
  {
    n: "02",
    title: "Match",
    body: "We score thousands of investors against your profile using real deal history.",
  },
  {
    n: "03",
    title: "Review",
    body: "See ranked matches with transparent reasoning, filters, and full investor detail.",
  },
];

export default function InvestorMatchingLandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-ink text-white">
        <Container>
          <div className="py-16 md:py-24">
            <p className="eyebrow text-white/60 mb-5 inline-flex items-center gap-2.5">
              <span className="w-5 h-px bg-white/30" aria-hidden="true" />
              Investor Intelligence
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white max-w-3xl text-balance">
              Find the investors who fit your company.
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/70 max-w-2xl leading-relaxed">
              Ranked by geography, sector relevance, stage fit, and activity —
              grounded in real deal history, not guesses.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/investor-matching/profile"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] bg-white text-ink font-semibold text-sm transition-colors hover:bg-white/90 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Create your profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/investors"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] border border-white/30 bg-transparent text-white font-semibold text-sm transition-colors hover:bg-white/10 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Browse investors
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 3-step explainer */}
      <section className="py-16 md:py-20 border-b border-border">
        <Container>
          <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
            <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
            How it works
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-balance mb-10 max-w-2xl">
            From profile to ranked matches in seconds.
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="bg-card border border-border rounded-[var(--radius-lg)] p-5 md:p-8"
              >
                <p className="font-mono text-xs font-semibold text-muted tabular-nums mb-4">
                  {s.n}
                </p>
                <h3 className="font-serif text-2xl text-ink mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Footer note */}
      <section className="py-10">
        <Container>
          <p className="text-xs text-muted max-w-2xl">
            Rankings combine declared investor focus with inferred activity
            patterns from real deal history. Matching is deterministic and
            reproducible — no black-box model.
          </p>
        </Container>
      </section>
    </main>
  );
}
