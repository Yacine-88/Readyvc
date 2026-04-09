/**
 * VCReady guided flow
 * Defines the step order and persists completion state via localStorage.
 */

export const FLOW_STEPS = [
  { id: "metrics" as const,   label: "Metrics",    href: "/metrics",   num: 1 },
  { id: "valuation" as const, label: "Valuation",  href: "/valuation", num: 2 },
  { id: "qa" as const,        label: "Q&A",        href: "/qa",        num: 3 },
  { id: "captable" as const,  label: "Cap Table",  href: "/captable",  num: 4 },
  { id: "pitch" as const,     label: "Pitch",      href: "/pitch",     num: 5 },
  { id: "dataroom" as const,  label: "Data Room",  href: "/dataroom",  num: 6 },
  { id: "dashboard" as const, label: "Dashboard",  href: "/dashboard", num: 7 },
] as const;

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

const STORAGE_KEY = "vcready_completed_steps";

export function getCompletedSteps(): FlowStepId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FlowStepId[]) : [];
  } catch {
    return [];
  }
}

export function markStepComplete(stepId: FlowStepId): void {
  if (typeof window === "undefined") return;
  const completed = getCompletedSteps();
  if (!completed.includes(stepId)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed, stepId]));
  }
}

/** A step is accessible if it's the first step, or the previous step is complete. */
export function isStepAccessible(stepId: FlowStepId, completedSteps: FlowStepId[]): boolean {
  const idx = FLOW_STEPS.findIndex((s) => s.id === stepId);
  if (idx <= 0) return true;
  return completedSteps.includes(FLOW_STEPS[idx - 1].id);
}

export function getNextStep(currentId: FlowStepId) {
  const idx = FLOW_STEPS.findIndex((s) => s.id === currentId);
  return idx >= 0 && idx < FLOW_STEPS.length - 1 ? FLOW_STEPS[idx + 1] : null;
}
