"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { FLOW_STEPS, getCompletedSteps, type FlowStepId } from "@/lib/flow";

const RETURN_FLAG_KEY = "vcready_investor_return";
const CORE_TOOL_IDS: FlowStepId[] = FLOW_STEPS.filter(
  (s) => s.id !== "dashboard"
).map((s) => s.id as FlowStepId);

interface FlowContinueProps {
  isComplete: boolean;
  nextHref: string;
  nextLabel: string;
  /** Final step variant — changes button text */
  isFinal?: boolean;
}

export function FlowContinue({
  isComplete,
  nextHref,
  nextLabel,
  isFinal = false,
}: FlowContinueProps) {
  const [override, setOverride] = useState<
    { href: string; label: string } | null
  >(null);

  useEffect(() => {
    if (!isComplete || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(RETURN_FLAG_KEY) !== "1") return;
      const done = getCompletedSteps();
      const allCoreDone = CORE_TOOL_IDS.every((id) => done.includes(id));
      if (allCoreDone || isFinal) {
        setOverride({ href: "/investors", label: "Find investors" });
      }
    } catch {
      /* ignore */
    }
  }, [isComplete, isFinal]);

  if (!isComplete) return null;

  const effectiveHref = override?.href ?? nextHref;
  const effectiveLabel = override?.label ?? nextLabel;
  const effectiveFinal = override ? false : isFinal;

  function handleClick() {
    if (!override) return;
    try {
      localStorage.removeItem(RETURN_FLAG_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-6 bg-card border border-border rounded-[var(--radius-lg)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <p className="text-xs text-muted mb-0.5">Step complete</p>
        <p className="text-sm font-semibold text-ink">
          {effectiveFinal
            ? "You've completed all steps."
            : `Ready to continue to ${effectiveLabel}?`}
        </p>
      </div>
      <Link
        href={effectiveHref}
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-[var(--radius-md)] bg-ink text-background text-sm font-semibold hover:bg-ink/80 transition-colors shrink-0"
      >
        {effectiveFinal ? "View Dashboard" : `Continue → ${effectiveLabel}`}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
