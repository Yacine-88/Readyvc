/**
 * Thin wrapper around the `import_runs` table so scripts can track
 * start / stats / errors / finish in one place.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ImportRowIssue,
  ImportRunStats,
  ImportStatus,
  Json,
} from "./import-types.js";

export interface ImportRunHandle {
  id: string;
  issues: ImportRowIssue[];
}

export async function startImportRun(
  client: SupabaseClient,
  args: {
    importType: string;
    source: string;
    fileName?: string | null;
  }
): Promise<ImportRunHandle> {
  const { data, error } = await client
    .from("import_runs")
    .insert({
      import_type: args.importType,
      source: args.source,
      file_name: args.fileName ?? null,
      status: "running" as ImportStatus,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create import_runs row: ${error?.message ?? "unknown"}`
    );
  }
  return { id: data.id, issues: [] };
}

export function recordIssue(
  handle: ImportRunHandle,
  issue: ImportRowIssue
): void {
  handle.issues.push(issue);
  // Soft cap so we don't blow up memory / the jsonb column on bad files.
  if (handle.issues.length > 5000) handle.issues.shift();
}

export async function finishImportRun(
  client: SupabaseClient,
  handle: ImportRunHandle,
  status: ImportStatus,
  stats: ImportRunStats
): Promise<void> {
  const { error } = await client
    .from("import_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      stats: stats as unknown as Json,
      errors: handle.issues.length ? (handle.issues as unknown as Json) : null,
    })
    .eq("id", handle.id);

  if (error) {
    // Don't throw — the import itself already succeeded/failed; we just
    // couldn't update bookkeeping. Log and move on.
    // eslint-disable-next-line no-console
    console.error("[import-logging] failed to update import_runs:", error.message);
  }
}

/** Pretty one-line console log used by all import scripts. */
export function logInfo(tag: string, msg: string, extra?: unknown): void {
  const suffix = extra !== undefined ? " " + JSON.stringify(extra) : "";
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${msg}${suffix}`);
}

export function logWarn(tag: string, msg: string, extra?: unknown): void {
  const suffix = extra !== undefined ? " " + JSON.stringify(extra) : "";
  // eslint-disable-next-line no-console
  console.warn(`[${tag}] WARN ${msg}${suffix}`);
}
