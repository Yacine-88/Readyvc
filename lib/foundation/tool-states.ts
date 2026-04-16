import { getLocalReadinessScore } from "@/lib/local-readiness";
import { createClient } from "@/lib/supabase-client";
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

// ─── localStorage cache writer (mirrors db-tools.ts syncAllToolsToLocalStorage) ─

function writeLocalCache(tool: FoundationTool, score: number, inputs: Record<string, unknown>, savedAt: string): void {
  try {
    switch (tool) {
      case "metrics": {
        // saveToolToDB stores: { sector, formData: {mrr,...}, derived: {arr, mrrGrowth, runway,...} }
        // local-readiness reads flat top-level keys — extract from nested structure
        const derived = (inputs.derived as Record<string, unknown>) ?? {};
        const fd = (inputs.formData as Record<string, unknown>) ?? {};
        localStorage.setItem("vcready_metrics", JSON.stringify({
          score,
          mrr:         fd.mrr          ?? inputs.mrr         ?? 0,
          arr:         derived.arr     ?? inputs.arr         ?? 0,
          growth_rate: derived.mrrGrowth ?? derived.growth_rate ?? inputs.growth_rate ?? 0,
          ltv_cac:     derived.ltvCacRatio ?? derived.ltv_cac ?? inputs.ltv_cac ?? 0,
          churn:       derived.churnRate   ?? derived.churn   ?? inputs.churn   ?? 0,
          runway:      derived.runway  ?? inputs.runway       ?? 0,
        }));
        localStorage.setItem("vcready_metrics_inputs", JSON.stringify(inputs));
        break;
      }
      case "valuation": {
        // inputs from saveToolToDB: { formData: {...}, derived: { estimated_valuation, ... } }
        // local-readiness reads flat top-level keys — extract from nested structure
        const derived = (inputs.derived as Record<string, unknown>) ?? {};
        const fd = (inputs.formData as Record<string, unknown>) ?? {};
        localStorage.setItem("vcready_valuation", JSON.stringify({
          score,
          estimated_valuation: derived.estimated_valuation ?? inputs.estimated_valuation ?? 0,
          valuation_low: derived.valuation_low ?? inputs.valuation_low ?? 0,
          valuation_high: derived.valuation_high ?? inputs.valuation_high ?? 0,
          sector: fd.sector ?? inputs.sector ?? "",
          stage: fd.stage ?? inputs.stage ?? "",
          growth_rate: fd.baseGrowthRatePct ?? inputs.growth_rate ?? 0,
        }));
        localStorage.setItem("vcready_valuation_inputs", JSON.stringify(inputs));
        break;
      }
      case "qa":
        localStorage.setItem("vcready_qa", JSON.stringify({ score }));
        localStorage.setItem("vcready_qa_inputs", JSON.stringify(inputs));
        break;
      case "captable":
        localStorage.setItem("vcready_captable", JSON.stringify({ score }));
        localStorage.setItem("vcready_captable_inputs", JSON.stringify(inputs));
        break;
      case "pitch":
        localStorage.setItem("vcready_pitch", JSON.stringify({ score }));
        localStorage.setItem("vcready_pitch_inputs", JSON.stringify(inputs));
        break;
      case "dataroom":
        localStorage.setItem("dataroom_results", JSON.stringify({ readinessScore: score, ...inputs }));
        localStorage.setItem("vcready_dataroom_inputs", JSON.stringify(inputs));
        break;
    }
  } catch {}
}

/**
 * C1: DB-first tool state loader.
 * Fetches all tool_saves from Supabase, populates localStorage, returns ToolState map.
 * Falls back to localStorage if unauthenticated or DB empty.
 * Migrates localStorage → DB when DB is empty.
 */
export async function getToolStates(): Promise<Record<FoundationTool, ToolState>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("tool_saves")
        .select("tool, score, inputs, saved_at")
        .eq("user_id", user.id);

      if (!error && data && data.length > 0) {
        // DB has data — hydrate localStorage so sync functions see it
        for (const row of data) {
          writeLocalCache(
            row.tool as FoundationTool,
            row.score,
            (row.inputs as Record<string, unknown>) ?? {},
            row.saved_at
          );
        }
        // Return normalized ToolState map from now-populated localStorage
        return getLocalToolStates();
      }

      // DB empty — migrate localStorage → DB (fire-and-forget)
      const local = getLocalToolStates();
      const hasLocal = Object.values(local).some((s) => s.score > 0);
      if (hasLocal) {
        void (async () => {
          try {
            const rows = (Object.entries(local) as Array<[FoundationTool, ToolState]>)
              .filter(([, state]) => state.score > 0)
              .map(([tool, state]) => ({
                user_id: user.id,
                tool,
                score: state.score,
                inputs: state.inputs,
                saved_at: state.saved_at ?? new Date().toISOString(),
              }));
            if (rows.length > 0) {
              await supabase.from("tool_saves").upsert(rows, { onConflict: "user_id,tool" });
            }
          } catch {}
        })();
      }
      return local;
    }
  } catch {}

  // Unauthenticated or error — fallback to localStorage
  return getLocalToolStates();
}