"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { FLOW_STEPS, type FlowStepId, isStepAccessible } from "@/lib/flow";

interface FlowProgressProps {
  currentStep: FlowStepId;
  completedSteps: FlowStepId[];
}

export function FlowProgress({ currentStep, completedSteps }: FlowProgressProps) {
  return (
    <nav
      aria-label="Guided flow progress"
      className="mb-8 overflow-x-auto"
    >
      <ol className="flex items-center min-w-max gap-0">
        {FLOW_STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const accessible = isStepAccessible(step.id, completedSteps) || isCurrent;

          const dotClass = isCurrent
            ? "bg-ink text-background border-ink"
            : isCompleted
            ? "bg-success/15 text-success border-success/40"
            : accessible
            ? "bg-background text-ink border-border"
            : "bg-background text-muted/40 border-border/40";

          const labelClass = isCurrent
            ? "text-ink font-semibold"
            : isCompleted
            ? "text-muted"
            : accessible
            ? "text-muted"
            : "text-muted/40";

          const node = (
            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${dotClass}`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                ) : (
                  <span className="text-[10px] font-bold leading-none">{step.num}</span>
                )}
              </div>
              {/* Label */}
              <span className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${labelClass}`}>
                {step.label}
              </span>
            </div>
          );

          return (
            <li key={step.id} className="flex items-center">
              {/* Connector */}
              {idx > 0 && (
                <div
                  className={`w-8 h-px mb-4 mx-1 transition-colors ${
                    completedSteps.includes(FLOW_STEPS[idx - 1].id)
                      ? "bg-border-strong"
                      : "bg-border"
                  }`}
                />
              )}

              {/* Step: link if accessible, span if not */}
              {accessible ? (
                <Link href={step.href} className="group">
                  {node}
                </Link>
              ) : (
                <span className="cursor-not-allowed">{node}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
