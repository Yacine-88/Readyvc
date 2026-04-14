export type FoundationTool =
  | "metrics"
  | "valuation"
  | "qa"
  | "captable"
  | "pitch"
  | "dataroom";

export type ToolStatus = "not_started" | "in_progress" | "completed";

export type GlobalVerdict = "Early" | "Improving" | "Fundable" | "Strong";

export interface FounderStartupProfile {
  founder_name: string;
  founder_email: string;
  startup_name: string;
  country: string;
  sector: string;
  stage: string;
  has_raised_before: boolean;

  arr: number;
  mrr: number;
  growth_rate: number;
  runway: number;
  estimated_valuation: number;

  completed_tools_count: number;
  overall_score: number;

  created_at: string;
  updated_at: string;
}

export interface ToolState {
  tool: FoundationTool;
  label: string;
  score: number;
  status: ToolStatus;
  completed: boolean;
  saved_at: string | null;
  inputs: Record<string, unknown>;
  summary: {
    started: boolean;
    score_label: string;
  };
}

export interface ReadinessRedFlag {
  id: string;
  label: string;
  reason: string;
  action: string;
  href?: string;
  blocking: boolean;
}

export interface GlobalReadinessSnapshot {
  overall_score: number;
  verdict: GlobalVerdict;
  blockers_count: number;
  red_flags: ReadinessRedFlag[];
  source_scores: Record<FoundationTool, number>;
  profile_completion_pct: number;
  strongest_tool: FoundationTool | null;
  weakest_tool: FoundationTool | null;
  missing_tools: FoundationTool[];
  completed_tools_count: number;
  saved_at: string;
}