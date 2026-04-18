import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read path for saved matches.
 *
 * 1. Resolve the startup_profiles row by id (URL key).
 * 2. If it carries a `startup_id`, read via `v_investor_matches_latest`
 *    keyed on startup_id and join investors for display.
 * 3. Otherwise (ephemeral / legacy profile), fall back to the legacy
 *    `investor_matches` table keyed on startup_profile_id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ startupProfileId: string }> }
) {
  const { startupProfileId } = await params;
  if (!startupProfileId) {
    return NextResponse.json(
      { ok: false, error: "startupProfileId required" },
      { status: 400 }
    );
  }

  const client = getSupabaseAdmin();

  // Resolve startup_profiles → startup_id (if any)
  const { data: profileRow, error: profileErr } = await client
    .from("startup_profiles")
    .select("id, startup_id")
    .eq("id", startupProfileId)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json(
      { ok: false, error: profileErr.message },
      { status: 500 }
    );
  }

  const startupId =
    (profileRow as { id: string; startup_id: string | null } | null)
      ?.startup_id ?? null;

  if (startupId) {
    const { data, error } = await client
      .from("v_investor_matches_latest")
      .select(
        "startup_id, investor_id, scoring_version, score_total, score_stage, score_sector, score_geo, score_activity, score_check_size, reasoning, rank_position, created_at, investors!inner(id, investor_name, hq_country, hq_region, website)"
      )
      .eq("startup_id", startupId)
      .eq("scoring_version", "v1")
      .order("rank_position", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no matches found" },
        { status: 404 }
      );
    }

    // Shape into the legacy SavedMatchRow envelope the UI already consumes.
    const rows = (data as Array<Record<string, unknown>>).map((r) => ({
      id: `${r.startup_id}:${r.investor_id}:${r.scoring_version}`,
      startup_profile_id: startupProfileId,
      investor_id: r.investor_id,
      score_total: r.score_total,
      score_stage: r.score_stage,
      score_sector: r.score_sector,
      score_geo: r.score_geo,
      score_activity: r.score_activity,
      score_check_size: r.score_check_size,
      reasoning: r.reasoning,
      rank_position: r.rank_position,
      scoring_version: r.scoring_version,
      created_at: r.created_at,
      investors: r.investors,
    }));
    return NextResponse.json({ ok: true, data: rows });
  }

  // Legacy fallback: ephemeral row without a startup_id link.
  const { data, error } = await client
    .from("investor_matches")
    .select(
      "id, startup_profile_id, investor_id, score_total, score_stage, score_sector, score_geo, score_activity, score_check_size, reasoning, rank_position, scoring_version, created_at, investors!inner(id, investor_name, hq_country, hq_region, website)"
    )
    .eq("startup_profile_id", startupProfileId)
    .eq("scoring_version", "v1")
    .order("rank_position", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: "no matches found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
