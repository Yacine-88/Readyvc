import { FLOW_STEPS, getCompletedSteps, type FlowStepId } from "@/lib/flow";
import {
  getProfileCompletionPct,
  getUnifiedProfile,
  refreshUnifiedProfile,
} from "./profile";
import { getToolStates } from "./tool-states";
import type {
  FoundationTool,
  GlobalReadinessSnapshot,
  GlobalVerdict,
  ReadinessRedFlag,
  ToolState,
} from "./types";

const WEIGHTS: Record<FoundationTool, number> = {
  metrics: 0.35,
  qa: 0.25,
  valuation: 0.2,
  captable: 0.1,
  pitch: 0.05,
  dataroom: 0.05,
};

const SNAPSHOT_HISTORY_KEY = "vcready_foundation_snapshots";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function getReadinessRedFlags(
  toolStates: Record<FoundationTool, ToolState>
): ReadinessRedFlag[] {
  const profile = getUnifiedProfile();
  const flags: ReadinessRedFlag[] = [];

  if (!profile.startup_name || !profile.sector || !profile.stage) {
    flags.push({
      id: "profile_incomplete",
      label: "Core startup profile incomplete",
      reason: "Startup name, sector or stage is missing.",
      action: "Complete your founder profile.",
      href: "/onboard",
      blocking: true,
    });
  }

  if (toolStates.metrics.score < 30) {
    flags.push({
      id: "metrics_low",
      label: "Metrics too weak",
      reason: "Traction and operating signals are below minimum investor expectations.",
      action: "Improve your metrics section first.",
      href: "/metrics",
      blocking: true,
    });
  }

  if (toolStates.qa.score < 30) {
    flags.push({
      id: "qa_low",
      label: "Q&A preparation too weak",
      reason: "Weak investor-answer readiness is a direct blocker in live meetings.",
      action: "Strengthen your Q&A preparation.",
      href: "/qa",
      blocking: true,
    });
  }

  if (profile.runway > 0 && profile.runway < 6) {
    flags.push({
      id: "runway_short",
      label: "Runway below 6 months",
      reason: "Fundraising pressure is too high and weakens negotiating leverage.",
      action: "Extend runway before fundraising aggressively.",
      href: "/metrics",
      blocking: true,
    });
  }

  if (toolStates.captable.score > 0 && toolStates.captable.score < 40) {
    flags.push({
      id: "captable_fragile",
      label: "Cap table is fragile",
      reason: "The equity structure may create diligence friction.",
      action: "Review and clean the cap table.",
      href: "/captable",
      blocking: false,
    });
  }

  if (toolStates.dataroom.score === 0 && toolStates.metrics.score >= 60) {
    flags.push({
      id: "dataroom_missing",
      label: "Data room not prepared",
      reason: "The business may be progressing, but diligence readiness is still missing.",
      action: "Prepare your data room.",
      href: "/dataroom",
      blocking: false,
    });
  }

  return flags;
}

export function getGlobalVerdict(
  overallScore: number,
  redFlags: ReadinessRedFlag[]
): GlobalVerdict {
  const blockingCount = redFlags.filter((flag) => flag.blocking).length;

  if (blockingCount >= 2) {
    return overallScore >= 35 ? "Improving" : "Early";
  }

  if (overallScore >= 80) return "Strong";
  if (overallScore >= 60) return "Fundable";
  if (overallScore >= 35) return "Improving";
  return "Early";
}

export function getResumeStep(toolStates: Record<FoundationTool, ToolState>): {
  id: FlowStepId;
  href: string;
  label: string;
} | null {
  const completedSteps = getCompletedSteps();

  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool].status === "in_progress" && !completedSteps.includes(step.id)) {
      return step;
    }
  }

  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool].status === "not_started") {
      return step;
    }
  }

  return null;
}

export async function computeGlobalReadiness(): Promise<GlobalReadinessSnapshot> {
  const profile = refreshUnifiedProfile();
  const toolStates = await getToolStates();

  const overall_score = Math.round(
    Object.entries(toolStates).reduce((sum, [tool, state]) => {
      return sum + state.score * WEIGHTS[tool as FoundationTool];
    }, 0)
  );

  const red_flags = getReadinessRedFlags(toolStates);
  const verdict = getGlobalVerdict(overall_score, red_flags);

  const toolEntries = Object.entries(toolStates) as Array<[FoundationTool, ToolState]>;
  const strongest_tool =
    toolEntries
      .slice()
      .sort((a, b) => b[1].score - a[1].score)
      .find(([, state]) => state.score > 0)?.[0] ?? null;

  const weakest_tool =
    toolEntries
      .slice()
      .sort((a, b) => a[1].score - b[1].score)
      .find(([, state]) => state.score < 70)?.[0] ?? null;

  const missing_tools = toolEntries
    .filter(([, state]) => state.score === 0)
    .map(([tool]) => tool);

  const completed_tools_count = toolEntries.filter(([, state]) => state.score > 0).length;

  return {
    overall_score,
    verdict,
    blockers_count: red_flags.filter((flag) => flag.blocking).length,
    red_flags,
    source_scores: {
      metrics: toolStates.metrics.score,
      valuation: toolStates.valuation.score,
      qa: toolStates.qa.score,
      captable: toolStates.captable.score,
      pitch: toolStates.pitch.score,
      dataroom: toolStates.dataroom.score,
    },
    profile_completion_pct: getProfileCompletionPct({
      ...profile,
      overall_score,
    }),
    strongest_tool,
    weakest_tool,
    missing_tools,
    completed_tools_count,
    saved_at: new Date().toISOString(),
  };
}

export function getSnapshotHistory(): GlobalReadinessSnapshot[] {
  return safeRead<GlobalReadinessSnapshot[]>(SNAPSHOT_HISTORY_KEY, []);
}

export function saveSnapshot(snapshot: GlobalReadinessSnapshot): void {
  const history = getSnapshotHistory();
  const next = [...history, snapshot].slice(-30);
  safeWrite(SNAPSHOT_HISTORY_KEY, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  }
}

export async function computeAndSaveGlobalReadiness(): Promise<GlobalReadinessSnapshot> {
  const snapshot = await computeGlobalReadiness();
  saveSnapshot(snapshot);
  return snapshot;
}