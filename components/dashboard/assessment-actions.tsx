"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Camera, Plus } from "lucide-react";
import { saveReadinessSnapshot, getLocalReadinessScore } from "@/lib/local-readiness";

const DRAFT_KEYS = [
  "vcready_metrics",
  "vcready_metrics_inputs",
  "vcready_valuation",
  "vcready_valuation_inputs",
  "vcready_qa",
  "vcready_qa_inputs",
  "vcready_captable",
  "vcready_captable_inputs",
  "vcready_pitch",
  "vcready_pitch_inputs",
  "dataroom_documents",
  "dataroom_results",
  "vcready_dataroom_inputs",
  "vcready_completed_steps",
];

export function AssessmentActions() {
  const router = useRouter();
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  function handleSaveSnapshot() {
    saveReadinessSnapshot();
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 2500);
  }

  function handleResetAssessment() {
    const score = getLocalReadinessScore().overall_score;
    const msg =
      score > 0
        ? "This will clear your current assessment inputs. Your score history will be preserved.\n\nContinue?"
        : "Reset your current assessment? This cannot be undone.";
    if (!confirm(msg)) return;
    DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
    router.refresh();
  }

  function handleNewAssessment() {
    const score = getLocalReadinessScore().overall_score;
    const msg =
      score > 0
        ? "Start a new assessment? Your current score will be saved to history first, then all inputs will be cleared.\n\nContinue?"
        : "Start a new assessment? Current inputs will be cleared.";
    if (!confirm(msg)) return;
    // Save current state to history before clearing
    if (score > 0) saveReadinessSnapshot();
    DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
    router.push("/metrics");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleSaveSnapshot}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/30 transition-colors"
      >
        <Camera className="w-3.5 h-3.5" aria-hidden="true" />
        {snapshotSaved ? "Snapshot saved ✓" : "Save snapshot"}
      </button>
      <button
        onClick={handleNewAssessment}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/30 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        New assessment
      </button>
      <button
        onClick={handleResetAssessment}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] border border-border bg-soft text-xs font-semibold text-muted hover:border-danger/30 hover:text-danger transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        Reset assessment
      </button>
    </div>
  );
}
