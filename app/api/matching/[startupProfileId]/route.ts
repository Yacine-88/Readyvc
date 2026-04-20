import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const { data, error } = await client
    .from("investor_matches")
    .select(
      "id, startup_profile_id, investor_id, score_total, score_stage, score_sector, score_geo, score_activity, score_check_size, reasoning, rank_position, scoring_version, created_at, investors!inner(id, investor_name, hq_country, hq_region, website)"
    )
    .eq("startup_profile_id", startupProfileId)
    .in("scoring_version", ["premium_v2", "simple_v1", "v1"])
    .order("rank_position", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: "no matches found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
