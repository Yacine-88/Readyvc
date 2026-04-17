import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseInvestorsListQuery } from "@/lib/investors/validation";
import { loadInvestorContexts } from "@/lib/investors/inference";
import { mapStartupStage } from "@/lib/investors/stage-mapping";
import type { CanonicalStage } from "@/lib/investors/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InvestorRow {
  id: string;
  investor_name: string;
  normalized_name: string;
  hq_city: string | null;
  hq_country: string | null;
  hq_region: string | null;
  website: string | null;
  investor_type: string | null;
}

interface ActivityRow {
  investor_id: string;
  deal_count: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseInvestorsListQuery(url.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const q = parsed.value;
  const client = getSupabaseAdmin();

  // Base filter on investors table (server-side filters).
  let base = client
    .from("investors")
    .select(
      "id, investor_name, normalized_name, hq_city, hq_country, hq_region, website, investor_type",
      { count: "exact" }
    );

  if (q.search) {
    base = base.ilike("normalized_name", `%${q.search.toLowerCase()}%`);
  }
  if (q.region) base = base.ilike("hq_region", q.region);
  if (q.country) base = base.ilike("hq_country", q.country);

  const needsPostFilter = !!(q.sector || q.stage || q.minActivity != null);

  // When we need post-filtering, pull a wider candidate set; else apply range.
  const from = (q.page - 1) * q.pageSize;
  const to = from + q.pageSize - 1;

  if (!needsPostFilter) {
    if (q.sort === "name_asc") {
      base = base.order("investor_name", { ascending: true });
    }
    base = base.range(from, to);
    const { data, error, count } = await base;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const rows = (data ?? []) as unknown as InvestorRow[];

    // Annotate with deal_count via activity table
    const ids = rows.map((r) => r.id);
    let activityMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: act, error: actErr } = await client
        .from("investor_activity_yearly")
        .select("investor_id, deal_count")
        .in("investor_id", ids);
      if (actErr) {
        return NextResponse.json({ ok: false, error: actErr.message }, { status: 500 });
      }
      for (const r of (act ?? []) as unknown as ActivityRow[]) {
        activityMap.set(
          r.investor_id,
          (activityMap.get(r.investor_id) ?? 0) + (r.deal_count ?? 0)
        );
      }
    }

    const annotated = rows.map((r) => ({
      ...r,
      deal_count: activityMap.get(r.id) ?? 0,
    }));

    if (q.sort === "activity_desc" || q.sort === "deals_desc") {
      annotated.sort((a, b) => b.deal_count - a.deal_count);
    }

    return NextResponse.json({
      ok: true,
      data: {
        rows: annotated,
        page: q.page,
        pageSize: q.pageSize,
        total: count ?? annotated.length,
      },
    });
  }

  // Post-filter path: fetch up to 2000 candidates matching server-side filters,
  // load contexts, then apply sector/stage/minActivity filters + sort + paginate.
  const LIMIT = 2000;
  const { data, error } = await base.limit(LIMIT);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as unknown as InvestorRow[];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({
      ok: true,
      data: { rows: [], page: q.page, pageSize: q.pageSize, total: 0 },
    });
  }

  const contexts = await loadInvestorContexts(client, ids);
  const desiredStage: CanonicalStage | null = q.stage ? mapStartupStage(q.stage) : null;
  const desiredSector = q.sector ? q.sector.toLowerCase() : null;

  const filtered = rows
    .map((r) => {
      const ctx = contexts.get(r.id);
      if (!ctx) return null;
      if (q.minActivity != null && ctx.deal_count < q.minActivity) return null;
      if (desiredSector) {
        const pool = new Set<string>([
          ...ctx.explicit_sector_focus.map((s) => s.toLowerCase()),
          ...ctx.inferred_sectors.map((s) => s.sector.toLowerCase()),
        ]);
        if (!pool.has(desiredSector)) return null;
      }
      if (desiredStage && desiredStage !== "other") {
        const count = ctx.inferred_stages[desiredStage] ?? 0;
        const explicit = ctx.explicit_stage_focus.some((s) =>
          s.toLowerCase().includes(desiredStage.replace("-", " "))
        );
        if (count === 0 && !explicit) return null;
      }
      return { ...r, deal_count: ctx.deal_count, activity_score: ctx.activity_score_raw };
    })
    .filter((x): x is InvestorRow & { deal_count: number; activity_score: number } => x !== null);

  if (q.sort === "name_asc") {
    filtered.sort((a, b) => a.investor_name.localeCompare(b.investor_name));
  } else if (q.sort === "deals_desc") {
    filtered.sort((a, b) => b.deal_count - a.deal_count);
  } else {
    filtered.sort((a, b) => b.activity_score - a.activity_score);
  }

  const total = filtered.length;
  const paged = filtered.slice(from, from + q.pageSize);

  return NextResponse.json({
    ok: true,
    data: { rows: paged, page: q.page, pageSize: q.pageSize, total },
  });
}
