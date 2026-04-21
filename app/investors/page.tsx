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

export default function InvestorsHubPage() {
  const { user, loading, isLocalOnly } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setHydrated(true);
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

  const readiness = computeReadiness(loading, isLocalOnly, !!user, hydrated);

  return (
    <main className="py-10 md:py-16">
      <Container narrow>
        <p className="eyebrow mb-3">Investor matching</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-ink text-balance">
          Find the investors who fit your company
        </h1>
        <p className="mt-3 text-base text-ink-secondary leading-relaxed max-w-xl">
          Ranked by geography, sector relevance, stage fit, and activity —
          grounded in real deal history.
        </p>

        <div className="mt-8 grid gap-3">
          <StepCard
            num={1}
            title="Create your account"
            done={readiness.state !== "loading" && readiness.state !== "anon"}
            active={readiness.state === "anon"}
          />
          <StepCard
            num={2}
            title="Complete your startup profile"
            done={
              readiness.state === "tools-incomplete" ||
              readiness.state === "ready"
            }
            active={readiness.state === "no-profile"}
          />
          <StepCard
            num={3}
            title="Finish your tools"
            done={readiness.state === "ready"}
            active={readiness.state === "tools-incomplete"}
            meta={
              readiness.state === "tools-incomplete"
                ? `${readiness.completed} / ${readiness.total} tools completed`
                : readiness.state === "ready"
                ? `${TOOL_STEPS.length} / ${TOOL_STEPS.length} tools completed`
                : undefined
            }
          />
        </div>

        <div className="mt-8 bg-card border border-border rounded-[var(--radius-lg)] p-5 md:p-8">
          {readiness.state === "loading" && (
            <div className="h-10 w-56 bg-soft rounded-[var(--radius-md)] animate-pulse" />
          )}

          {readiness.state === "anon" && (
            <>
              <p className="text-sm text-ink-secondary mb-4">
                Create your account to unlock investor matching.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                >
                  Create your account →
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/30 transition-colors"
                >
                  Log in
                </Link>
              </div>
            </>
          )}

          {readiness.state === "no-profile" && (
            <>
              <p className="text-sm text-ink-secondary mb-4">
                Complete your startup profile first.
              </p>
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Complete your profile →
              </Link>
            </>
          )}

          {readiness.state === "tools-incomplete" && (
            <>
              <p className="text-sm text-ink-secondary mb-1">
                Finish your tools before unlocking investor matching.
              </p>
              <p className="text-xs text-muted mb-4">
                {readiness.completed} / {readiness.total} tools completed
              </p>
              <Link
                href={readiness.nextHref}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Continue: {readiness.nextLabel} →
              </Link>
            </>
          )}

          {readiness.state === "ready" && (
            <>
              <p className="text-sm text-ink-secondary mb-4">
                You&rsquo;re ready to find investors.
              </p>
              <Link
                href="/investor-matching/profile"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Run investor matching →
              </Link>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}

function StepCard({
  num,
  title,
  done,
  active,
  meta,
}: {
  num: number;
  title: string;
  done: boolean;
  active: boolean;
  meta?: string;
}) {
  const tone = done
    ? "border-success/40 bg-success/5"
    : active
    ? "border-accent/40 bg-accent/5"
    : "border-border bg-card";
  const badgeTone = done
    ? "bg-success text-white"
    : active
    ? "bg-accent text-white"
    : "bg-soft text-muted";
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 ${tone}`}
    >
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shrink-0 ${badgeTone}`}
        aria-hidden="true"
      >
        {done ? "✓" : num}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {meta && <p className="text-xs text-muted mt-0.5">{meta}</p>}
      </div>
    </div>
  );
}
