/**
 * Readiness history persistence in Supabase.
 * Mirrors the localStorage-based history in local-readiness.ts.
 */

import { createClient } from "./supabase-client";
import type { ReadinessSnapshot } from "./local-readiness";

/** Save a readiness snapshot to DB. Best effort — does not throw. */
export async function saveHistoryToDB(snapshot: ReadinessSnapshot): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("readiness_history").insert({
    user_id: user.id,
    overall_score: snapshot.overall_score,
    metrics_score: snapshot.metrics_score,
    valuation_score: snapshot.valuation_score,
    qa_score: snapshot.qa_score,
    cap_table_score: snapshot.cap_table_score,
    pitch_score: snapshot.pitch_score,
    dataroom_score: snapshot.dataroom_score,
    saved_at: snapshot.timestamp,
  });
}

/** Fetch readiness history from DB (most recent first, up to 20 entries). */
export async function getHistoryFromDB(): Promise<ReadinessSnapshot[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("readiness_history")
    .select("*")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row: Record<string, number | string>) => ({
    timestamp: row.saved_at as string,
    overall_score: row.overall_score as number,
    metrics_score: row.metrics_score as number,
    valuation_score: row.valuation_score as number,
    qa_score: row.qa_score as number,
    cap_table_score: row.cap_table_score as number,
    pitch_score: row.pitch_score as number,
    dataroom_score: row.dataroom_score as number,
  }));
}
