import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseStartupProfileBody } from "@/lib/investors/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseStartupProfileBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("startup_profiles")
    .insert({
      user_id: parsed.value.user_id ?? null,
      startup_name: parsed.value.startup_name,
      description: parsed.value.description ?? null,
      country: parsed.value.country ?? null,
      region: parsed.value.region ?? null,
      stage: parsed.value.stage ?? null,
      sectors: parsed.value.sectors ?? null,
      business_model: parsed.value.business_model ?? null,
      target_markets: parsed.value.target_markets ?? null,
      revenue_model: parsed.value.revenue_model ?? null,
      valuation_estimate: parsed.value.valuation_estimate ?? null,
      fundraising_target_usd: parsed.value.fundraising_target_usd ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
