"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/section";
import { useAuth } from "@/lib/auth-context";
import { isOnboarded } from "@/lib/onboard";
import { FLOW_STEPS, getCompletedSteps, type FlowStepId } from "@/lib/flow";

type Readiness =
  | { state: "loading" }
  | { state: "anon" }
  | { state: "no-profile" }
  | {
      state: "tools-incomplete";
      completed: number;
      total: number;
      nextHref: string;
      nextLabel: string;
    }
  | { state: "ready" };

const TOOL_STEPS = FLOW_STEPS.filter((s) => s.id !== "dashboard");
const RETURN_FLAG_KEY = "vcready_investor_return";

function computeReadiness(
  loading: boolean,
  isLocalOnly: boolean,
  hasUser: boolean,
  hydrated: boolean
): Readiness {
  if (!hydrated || (loading && !isLocalOnly)) return { state: "loading" };
  if (!isLocalOnly && !hasUser) return { state: "anon" };
  if (!isOnboarded()) return { state: "no-profile" };
  const completed = getCompletedSteps();
  const total = TOOL_STEPS.length;
  const doneCount = TOOL_STEPS.filter((s) =>
    completed.includes(s.id as FlowStepId)
  ).length;
  if (doneCount < total) {
    const nextStep =
      TOOL_STEPS.find((s) => !completed.includes(s.id as FlowStepId)) ??
      TOOL_STEPS[0];
    return {
      state: "tools-incomplete",
      completed: doneCount,
      total,
      nextHref: nextStep.href,
      nextLabel: nextStep.label,
    };
  }
  return { state: "ready" };
}

function markReturnIntent() {
  try {
    localStorage.setItem(RETURN_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function InvestorsHubPage() {
  const { user, loading, isLocalOnly } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setHydrated(true);
    // Landing on /investors clears any stale return flag — user is already here.
    try {
      localStorage.removeItem(RETURN_FLAG_KEY);
    } catch {
      /* ignore */
    }
    function sync() {
      setTick((t) => t + 1);
    }
    window.addEventListener("vcready:profile-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vcready:profile-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const r = computeReadiness(loading, isLocalOnly, !!user, hydrated);

  const steps: Array<{
    title: string;
    desc: string;
    done: boolean;
    active: boolean;
    meta?: string;
  }> = [
    {
      title: "Your account",
      desc: "Sign in so we can save your profile and matches.",
      done: r.state !== "loading" && r.state !== "anon",
      active: r.state === "anon",
    },
    {
      title: "Your startup profile",
      desc: "Country, stage and sector — used to score investor fit.",
      done: r.state === "tools-incomplete" || r.state === "ready",
      active: r.state === "no-profile",
    },
    {
      title: "Your core tools",
      desc: "Metrics, valuation, Q&A, cap table, pitch and data room.",
      done: r.state === "ready",
      active: r.state === "tools-incomplete",
      meta:
        r.state === "tools-incomplete"
          ? `${r.completed} of ${r.total} complete`
          : r.state === "ready"
          ? `${TOOL_STEPS.length} of ${TOOL_STEPS.length} complete`
          : undefined,
    },
  ];

  return (
    <main className="py-10 md:py-16">
      <Container narrow>
        <p className="eyebrow mb-3">Investor matching</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-ink text-balance">
          Find the investors who fit your company.
        </h1>
        <p className="mt-3 text-base text-ink-secondary leading-relaxed max-w-xl">
          Ranked by geography, sector relevance, stage fit, and activity —
          grounded in real deal history. Three short steps unlock your matches.
        </p>

        {/* Roadmap */}
        <ol className="mt-10 relative border-l border-border pl-6 space-y-7">
          {steps.map((s, i) => {
            const status = s.done ? "done" : s.active ? "active" : "pending";
            const dot =
              status === "done"
                ? "bg-success border-success text-white"
                : status === "active"
                ? "bg-accent border-accent text-white"
                : "bg-background border-border text-muted";
            return (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[33px] top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${dot}`}
                  aria-hidden="true"
                >
                  {status === "done" ? "✓" : i + 1}
                </span>
                <p
                  className={`text-sm font-semibold ${
                    status === "pending" ? "text-muted" : "text-ink"
                  }`}
                >
                  {s.title}
                </p>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                  {s.desc}
                </p>
                {s.meta && (
                  <p className="text-[11px] text-muted mt-1 font-medium tabular-nums">
                    {s.meta}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {/* One contextual CTA */}
        <div className="mt-10 pt-8 border-t border-border">
          {r.state === "loading" && (
            <div className="h-5 w-40 bg-soft rounded animate-pulse" />
          )}

          {r.state === "anon" && (
            <>
              <Link
                href="/onboard?redirectTo=/investors"
                onClick={markReturnIntent}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
              >
                Create your account →
              </Link>
              <p className="mt-3 text-xs text-muted">
                Already have an account?{" "}
                <Link
                  href="/auth/login?redirectTo=/investors"
                  className="text-ink underline underline-offset-2 hover:text-accent"
                >
                  Log in
                </Link>
                .
              </p>
            </>
          )}

          {r.state === "no-profile" && (
            <>
              <Link
                href="/onboard?redirectTo=/investors"
                onClick={markReturnIntent}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
              >
                Complete your startup profile →
              </Link>
              <p className="mt-3 text-xs text-muted">Takes about a minute.</p>
            </>
          )}

          {r.state === "tools-incomplete" && (
            <>
              <Link
                href={r.nextHref}
                onClick={markReturnIntent}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
              >
                Continue with {r.nextLabel} →
              </Link>
              <p className="mt-3 text-xs text-muted">
                You&rsquo;ll come back here automatically once your tools are
                complete.
              </p>
            </>
          )}

          {r.state === "ready" && (
            <>
              <Link
                href="/investor-matching/profile"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Run investor matching →
              </Link>
              <p className="mt-3 text-xs text-muted">
                You can update your matching profile any time.
              </p>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
