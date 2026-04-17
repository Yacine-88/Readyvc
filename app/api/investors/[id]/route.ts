import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getInvestorContext } from "@/lib/investors/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const client = getSupabaseAdmin();

  const { data: investor, error: invErr } = await client
    .from("investors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (invErr) {
    return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  }
  if (!investor) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const ctx = await getInvestorContext(client, id);

  const { data: yearly, error: yErr } = await client
    .from("investor_activity_yearly")
    .select("activity_year, deal_count, source")
    .eq("investor_id", id)
    .order("activity_year", { ascending: false });
  if (yErr) {
    return NextResponse.json({ ok: false, error: yErr.message }, { status: 500 });
  }

  const { data: deals, error: dErr } = await client
    .from("deal_investors")
    .select(
      "deal_id, role, is_lead, deals!inner(id, company_name, company_country, company_region, sector, round_type, amount_raised_usd, announced_at)"
    )
    .eq("investor_id", id)
    .order("announced_at", { referencedTable: "deals", ascending: false })
    .limit(50);
  if (dErr) {
    return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      investor,
      yearly_activity: yearly ?? [],
      recent_deals: deals ?? [],
      inferred: ctx
        ? {
            countries: ctx.inferred_countries,
            regions: ctx.inferred_regions,
            sectors: ctx.inferred_sectors,
            stages: ctx.inferred_stages,
            deal_count: ctx.deal_count,
            activity_by_year: ctx.activity_by_year,
            activity_score_raw: ctx.activity_score_raw,
            typical_check_usd: ctx.typical_check_usd,
          }
        : null,
    },
  });
}
