"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
  if (!isComplete) return null;

  return (
    <div className="mt-6 bg-card border border-border rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <p className="text-xs text-muted mb-0.5">Step complete</p>
        <p className="text-sm font-semibold text-ink">
          {isFinal ? "You've completed all steps." : `Ready to continue to ${nextLabel}?`}
        </p>
      </div>
      <Link
        href={nextHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-ink text-background text-sm font-semibold hover:bg-ink/80 transition-colors shrink-0"
      >
        {isFinal ? "View Dashboard" : `Continue → ${nextLabel}`}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
