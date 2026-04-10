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
        case "metrics":
          localStorage.setItem("vcready_metrics", JSON.stringify({ score: save.score, ...inputs }));
          localStorage.setItem("vcready_metrics_inputs", JSON.stringify(inputs));
          break;
        case "valuation":
          localStorage.setItem("vcready_valuation", JSON.stringify({ score: save.score, ...inputs }));
          localStorage.setItem("vcready_valuation_inputs", JSON.stringify(inputs));
          break;
        case "qa":
          localStorage.setItem("vcready_qa", JSON.stringify({ score: save.score }));
          localStorage.setItem("vcready_qa_inputs", JSON.stringify(inputs));
          break;
        case "captable":
          localStorage.setItem("vcready_captable", JSON.stringify({ score: save.score }));
          localStorage.setItem("vcready_captable_inputs", JSON.stringify(inputs));
          break;
        case "pitch": {
          // pitch uses an array of saves
          const existing = (() => { try { return JSON.parse(localStorage.getItem("vcready_pitch") ?? "[]"); } catch { return []; } })();
          const entry = { overallScore: save.score, answers: (inputs as any).answers ?? {}, timestamp: save.saved_at };
          if (!existing.some((e: any) => e.timestamp === save.saved_at)) {
            existing.push(entry);
            localStorage.setItem("vcready_pitch", JSON.stringify(existing));
          }
          localStorage.setItem("vcready_pitch_inputs", JSON.stringify(inputs));
          break;
        }
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
