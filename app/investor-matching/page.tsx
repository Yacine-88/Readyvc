"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { Container } from "@/components/layout/section";
import { createClient } from "@/lib/supabase-client";
import {
  buildStartupContext,
  type ContextGap,
  type StartupContextBuild,
} from "@/lib/investors/build-startup-context";
import { runMatching } from "@/lib/investors/api-client";

type RunStatus =
  | { kind: "idle" }
  | { kind: "running"; message: string }
  | { kind: "error"; message: string };

const STEPS = [
  {
    n: "01",
    title: "Auto-fill",
    body:
      "We read what you've already entered in onboarding, Valuation, and Metrics — no new form required.",
  },
  {
    n: "02",
    title: "Match",
    body:
      "Thousands of investors scored against your profile using real deal history.",
  },
  {
    n: "03",
    title: "Review",
    body:
      "See ranked matches with transparent reasoning, filters, and full investor detail.",
  },
];

export default function InvestorMatchingLandingPage() {
  const router = useRouter();
  const [build, setBuild] = useState<StartupContextBuild | null>(null);
  const [status, setStatus] = useState<RunStatus>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let userId: string | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch {
        userId = null;
      }
      const b = await buildStartupContext(userId);
      if (!cancelled) setBuild(b);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFindInvestors(): Promise<void> {
    if (!build?.isUsable) return;
    setStatus({ kind: "running", message: "Assembling your profile…" });
    try {
      const res = await runMatching({
        startup_context: build.context,
        topK: 50,
      });
      const id = res.startup_profile_id;
      if (!id) throw new Error("Matching succeeded but no profile id was returned.");
      setStatus({ kind: "running", message: "Scoring investors…" });
      router.push(`/investor-matching/results/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setStatus({ kind: "error", message: msg });
    }
  }

  const isReady = !!build?.isUsable;
  const hasContext = !!(build && build.context.startup_name);
  const running = status.kind === "running";

  return (
    <main>
      {/* Hero */}
      <section className="bg-ink text-white">
        <Container>
          <div className="py-14 md:py-24">
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
              <button
                type="button"
                onClick={handleFindInvestors}
                disabled={!isReady || running}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] bg-white text-ink font-semibold text-sm transition-colors hover:bg-white/90 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {running ? status.message : "Find Investors"}
                {!running && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
              <Link
                href="/investor-matching/profile"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] border border-white/30 bg-transparent text-white font-semibold text-sm transition-colors hover:bg-white/10 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Refine your profile
              </Link>
              <Link
                href="/investors"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] text-white/80 font-semibold text-sm transition-colors hover:text-white w-full sm:w-auto"
              >
                Browse investors →
              </Link>
            </div>

            <div className="mt-8 max-w-2xl">
              {build === null ? (
                <div className="h-10 w-72 bg-white/10 rounded-[var(--radius-sm)] animate-pulse" />
              ) : !hasContext ? (
                <div className="rounded-[var(--radius-sm)] border border-white/20 bg-white/5 p-4 text-sm text-white/80">
                  We couldn&apos;t find your startup info yet.{" "}
                  <Link
                    href="/onboard"
                    className="underline underline-offset-2 font-semibold text-white hover:text-white/90"
                  >
                    Complete onboarding
                  </Link>{" "}
                  to unlock one-click matching.
                </div>
              ) : (
                <ContextSummaryDark build={build} />
              )}
              {status.kind === "error" && (
                <p className="mt-3 text-sm text-[#FFB4B4]" role="alert">
                  {status.message}
                </p>
              )}
            </div>
          </div>
        </Container>
      </section>

      {build?.missing.length ? (
        <section className="py-10 md:py-14 border-b border-border bg-soft/40">
          <Container>
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
              Sharpen matching
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {build.missing.map((gap) => (
                <GapCard key={gap.field} gap={gap} />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Matching works with whatever you&apos;ve got — closing these gaps
              just sharpens the ranking.
            </p>
          </Container>
        </section>
      ) : null}

      <section className="py-14 md:py-20 border-b border-border">
        <Container>
          <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
            <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
            How it works
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-balance mb-10 max-w-2xl">
            Zero forms. One click. Ranked matches.
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
                <h3 className="font-serif text-2xl text-ink mb-2">{s.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function ContextSummaryDark({ build }: { build: StartupContextBuild }) {
  const ctx = build.context;
  const chips: Array<{ label: string; value: string | null }> = [
    { label: "Startup", value: ctx.startup_name },
    { label: "Stage", value: ctx.stage },
    { label: "Sector", value: ctx.sectors?.[0] ?? null },
    { label: "Country", value: ctx.country },
  ];
  return (
    <div className="rounded-[var(--radius-sm)] border border-white/15 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs text-white/60 font-semibold uppercase tracking-wider mb-3">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Using your existing data
      </div>
      <div className="flex flex-wrap gap-2">
        {chips
          .filter((c) => c.value)
          .map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white"
            >
              <span className="text-white/50">{c.label}</span>
              <span className="font-semibold">{c.value}</span>
            </span>
          ))}
      </div>
    </div>
  );
}

function GapCard({ gap }: { gap: ContextGap }) {
  return (
    <Link
      href={gap.href}
      className="group flex items-start gap-3 bg-card border border-border rounded-[var(--radius-lg)] p-4 md:p-5 transition-colors hover:border-ink/30"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft">
        <AlertCircle className="h-4 w-4 text-muted" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{gap.prompt}</p>
        <p className="mt-1 text-xs font-semibold text-muted group-hover:text-ink transition-colors">
          {gap.toolLabel} →
        </p>
      </div>
    </Link>
  );
}
