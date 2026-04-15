import { getLocalReadinessScore } from "@/lib/local-readiness";
import type { FoundationTool, ToolState, ToolStatus } from "./types";

const TOOL_LABELS: Record<FoundationTool, string> = {
  metrics: "Metrics",
  valuation: "Valuation",
  qa: "Q&A",
  captable: "Cap Table",
  pitch: "Pitch",
  dataroom: "Data Room",
};

function getStatus(score: number): ToolStatus {
  if (score >= 70) return "completed";
  if (score > 0) return "in_progress";
  return "not_started";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "strong";
  if (score >= 60) return "solid";
  if (score >= 35) return "weak";
  if (score > 0) return "very weak";
  return "empty";
}

function normalizeToolState(params: {
  tool: FoundationTool;
  score: number;
  saved_at?: string | null;
  inputs?: Record<string, unknown>;
}): ToolState {
  const status = getStatus(params.score);

  return {
    tool: params.tool,
    label: TOOL_LABELS[params.tool],
    score: Math.max(0, Math.min(100, Math.round(params.score || 0))),
    status,
    completed: status === "completed",
    saved_at: params.saved_at ?? null,
    inputs: params.inputs ?? {},
    summary: {
      started: (params.score || 0) > 0,
      score_label: getScoreLabel(params.score || 0),
    },
  };
}

export function getLocalToolStates(): Record<FoundationTool, ToolState> {
  const readiness = getLocalReadinessScore();

  return {
    metrics: normalizeToolState({
      tool: "metrics",
      score: readiness.metrics_score,
      inputs: {
        mrr: readiness.mrr,
        arr: readiness.arr,
        growth_rate: readiness.growth_rate,
        runway: readiness.runway,
      },
    }),
    valuation: normalizeToolState({
      tool: "valuation",
      score: readiness.valuation_score,
      inputs: {
        estimated_valuation: readiness.estimated_valuation,
        sector: readiness.sector,
        stage: readiness.stage,
      },
    }),
    qa: normalizeToolState({
      tool: "qa",
      score: readiness.qa_score,
    }),
    captable: normalizeToolState({
      tool: "captable",
      score: readiness.cap_table_score,
    }),
    pitch: normalizeToolState({
      tool: "pitch",
      score: readiness.pitch_score,
    }),
    dataroom: normalizeToolState({
      tool: "dataroom",
      score: readiness.dataroom_score,
    }),
  };
}

export async function getToolStates(): Promise<Record<FoundationTool, ToolState>> {
  return getLocalToolStates();
}