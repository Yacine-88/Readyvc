/**
 * POST /api/matching/simple-run
 *
 * Parallel implementation (Option A2). Does NOT modify or replace
 * `/api/matching/run` or the existing scoring engine.
 *
 * Request body:
 *   { stage, sectors, country, region, raise_amount }
 *
 * Response:
 *   { ok: true, data: [{ investor_name, score, reasons }] }
 *
 * Persistence:
 *   * Creates an ephemeral `startup_profiles` row (revenue_model sentinel
 *     `__simple_v1_ephemeral__`) to anchor the matches via FK.
 *   * Writes results into legacy `public.investor_matches` with
 *     `scoring_version = 'simple_v1'`. Unique index
 *     `(startup_profile_id, investor_id, scoring_version)` guarantees
 *     no duplicates per run.
 *   * Does NOT write to `investor_matches_unified`.
 *
 * Persistence failures do not fail the response — scoring is still returned.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  scoreInvestor,
  type SimpleInvestor,
  type SimpleStartupInput,
} from "@/lib/investors/simple-scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SimpleRunBody {
  stage?: string | null;
  sectors?: string[] | string | null;
  country?: string | null;
  region?: string | null;
  raise_amount?: number | string | null;
}

interface ScoredRow {
  id: string;
  investor_name: string;
  score: number;
  reasons: string[];
  breakdown: { stage: number; sector: number; geo: number; check: number };
}

const SCORING_VERSION = "simple_v1";
const EPHEMERAL_SENTINEL = "__simple_v1_ephemeral__";
const TOP_K_PERSIST = 50;

export async function POST(request: Request) {
  let body: SimpleRunBody;
  try {
    body = (await request.json()) as SimpleRunBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON" },
      { status: 400 }
    );
  }

  const startup: SimpleStartupInput = {
    stage: body.stage ?? null,
    sectors: body.sectors ?? null,
    country: body.country ?? null,
    region: body.region ?? null,
    raise_amount: body.raise_amount ?? null,
  };

  const client = getSupabaseAdmin();

  // -------------------------------------------------------------------------
  // Load investors — only the columns the simple engine needs.
  // -------------------------------------------------------------------------
  const { data: investors, error: fetchErr } = await client
    .from("investors")
    .select(
      [
        "id",
        "investor_name",
        "hq_country",
        "hq_region",
        "geo_focus",
        "stage_focus",
        "sector_focus",
        "check_min_usd",
        "check_max_usd",
      ].join(", ")
    );

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, error: `investors query failed: ${fetchErr.message}` },
      { status: 500 }
    );
  }

  const scored: ScoredRow[] = ((investors ?? []) as unknown as SimpleInvestor[])
    .map((inv) => {
      const s = scoreInvestor(inv, startup);
      return {
        id: inv.id,
        investor_name: inv.investor_name ?? "(unnamed)",
        score: s.score,
        reasons: s.reasons,
        breakdown: s.breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);

  const publicData = scored.map((s) => ({
    investor_name: s.investor_name,
    score: s.score,
    reasons: s.reasons,
  }));

  // -------------------------------------------------------------------------
  // Persist: ephemeral startup_profiles row + investor_matches rows.
  // Persistence failures are non-fatal; we log and return scoring anyway.
  // -------------------------------------------------------------------------
  let persisted = false;
  let startupProfileId: string | null = null;

  try {
    const sectorsJson =
      Array.isArray(body.sectors)
        ? body.sectors
        : typeof body.sectors === "string" && body.sectors.trim().length > 0
          ? body.sectors.split(",").map((s) => s.trim()).filter(Boolean)
          : null;

    const raiseNum =
      typeof body.raise_amount === "number"
        ? body.raise_amount
        : body.raise_amount
          ? Number(body.raise_amount)
          : null;

    const { data: profileRow, error: profErr } = await client
      .from("startup_profiles")
      .insert({
        startup_name: `simple_v1_run_${Date.now()}`,
        stage: body.stage ?? null,
        country: body.country ?? null,
        region: body.region ?? null,
        sectors: sectorsJson,
        fundraising_target_usd:
          raiseNum != null && Number.isFinite(raiseNum) ? raiseNum : null,
        revenue_model: EPHEMERAL_SENTINEL,
      })
      .select("id")
      .single();

    if (profErr || !profileRow) {
      console.warn(
        "[simple-run] ephemeral startup_profiles insert failed:",
        profErr?.message
      );
    } else {
      startupProfileId = profileRow.id as string;
      const topRows = scored.slice(0, TOP_K_PERSIST);
      if (topRows.length > 0) {
        const rows = topRows.map((s, i) => ({
          startup_profile_id: startupProfileId,
          investor_id: s.id,
          score_total: s.score,
          score_stage: s.breakdown.stage,
          score_sector: s.breakdown.sector,
          score_geo: s.breakdown.geo,
          score_check_size: s.breakdown.check,
          reasoning: s.reasons.join(" | "),
          rank_position: i + 1,
          scoring_version: SCORING_VERSION,
        }));
        const { error: insErr } = await client
          .from("investor_matches")
          .insert(rows);
        if (insErr) {
          console.warn(
            "[simple-run] investor_matches insert failed:",
            insErr.message
          );
        } else {
          persisted = true;
        }
      } else {
        // No scored rows to persist, but the profile row exists — still "ok".
        persisted = true;
      }
    }
  } catch (e) {
    console.warn(
      "[simple-run] persistence threw:",
      e instanceof Error ? e.message : String(e)
    );
  }

  return NextResponse.json({
    ok: true,
    data: publicData,
    persisted,
    startup_profile_id: startupProfileId,
    scoring_version: SCORING_VERSION,
  });
}
