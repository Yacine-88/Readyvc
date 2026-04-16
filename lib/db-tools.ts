/**
 * Unified tool persistence in Supabase via the `tool_saves` table.
 * One row per user per tool, upserted on every save.
 * Inputs stored as JSONB for full form restoration.
 */

import { createClient } from "./supabase-client";

export type ToolName = "metrics" | "valuation" | "qa" | "captable" | "pitch" | "dataroom";

export interface ToolSave {
  tool: ToolName;
  score: number;
  inputs: Record<string, unknown>;
  saved_at: string;
}

/** Persist a tool save to Supabase (upsert). Returns true on success. */
export async function saveToolToDB(
  tool: ToolName,
  score: number,
  inputs: Record<string, unknown>
): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("tool_saves")
    .upsert(
      {
        user_id: user.id,
        tool,
        score,
        inputs,
        saved_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tool" }
    );

  if (error) {
    console.error(`[db-tools] Error saving ${tool}:`, error.message);
    return false;
  }
  return true;
}

/** Fetch a single tool save from Supabase. Returns null if not found or not authenticated. */
export async function getToolFromDB(tool: ToolName): Promise<ToolSave | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("tool_saves")
    .select("tool, score, inputs, saved_at")
    .eq("user_id", user.id)
    .eq("tool", tool)
    .single();

  if (error || !data) return null;
  return data as ToolSave;
}

/** Fetch all tool saves from Supabase. Returns a map keyed by tool name. */
export async function getAllToolsFromDB(): Promise<Partial<Record<ToolName, ToolSave>>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("tool_saves")
    .select("tool, score, inputs, saved_at")
    .eq("user_id", user.id);

  if (error || !data) return {};

  const result: Partial<Record<ToolName, ToolSave>> = {};
  for (const row of data) {
    result[row.tool as ToolName] = row as ToolSave;
  }
  return result;
}

/**
 * Sync all tool saves from DB into localStorage.
 * Called on dashboard mount to ensure latest data is available for readiness scoring.
 * Only writes localStorage keys that have DB data; never clears existing local data.
 */
export async function syncAllToolsToLocalStorage(): Promise<void> {
  const tools = await getAllToolsFromDB();

  const entries = Object.entries(tools) as Array<[ToolName, ToolSave]>;
  if (entries.length === 0) return;

  for (const [tool, save] of entries) {
    const inputs = save.inputs ?? {};
    try {
      // Write score key (used by local-readiness)
      switch (tool) {
        case "metrics": {
          // saveToolToDB stores: { sector, formData: {mrr,...}, derived: {arr, mrrGrowth, runway,...} }
          const derived = (inputs.derived as Record<string, unknown>) ?? {};
          const fd = (inputs.formData as Record<string, unknown>) ?? {};
          localStorage.setItem("vcready_metrics", JSON.stringify({
            score: save.score,
            mrr:         fd.mrr             ?? inputs.mrr         ?? 0,
            arr:         derived.arr        ?? inputs.arr         ?? 0,
            growth_rate: derived.mrrGrowth  ?? derived.growth_rate ?? inputs.growth_rate ?? 0,
            ltv_cac:     derived.ltvCacRatio ?? derived.ltv_cac   ?? inputs.ltv_cac     ?? 0,
            churn:       derived.churnRate  ?? derived.churn      ?? inputs.churn       ?? 0,
            runway:      derived.runway     ?? inputs.runway       ?? 0,
          }));
          localStorage.setItem("vcready_metrics_inputs", JSON.stringify(inputs));
          break;
        }
        case "valuation": {
          // inputs shape: { formData: {...}, derived: { estimated_valuation, ... } }
          // local-readiness reads flat top-level keys — extract from nested structure
          const derived = (inputs.derived as Record<string, unknown>) ?? {};
          const fd = (inputs.formData as Record<string, unknown>) ?? {};
          localStorage.setItem("vcready_valuation", JSON.stringify({
            score: save.score,
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
          localStorage.setItem("vcready_qa", JSON.stringify({ score: save.score }));
          localStorage.setItem("vcready_qa_inputs", JSON.stringify(inputs));
          break;
        case "captable":
          localStorage.setItem("vcready_captable", JSON.stringify({ score: save.score }));
          localStorage.setItem("vcready_captable_inputs", JSON.stringify(inputs));
          break;
        case "pitch":
          localStorage.setItem("vcready_pitch", JSON.stringify({ score: save.score }));
          localStorage.setItem("vcready_pitch_inputs", JSON.stringify(inputs));
          break;
        case "dataroom":
          localStorage.setItem("dataroom_results", JSON.stringify({ readinessScore: save.score, ...inputs }));
          localStorage.setItem("vcready_dataroom_inputs", JSON.stringify(inputs));
          break;
      }
    } catch {
      // ignore localStorage errors
    }
  }
}
