import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseRunMatchingBody } from "@/lib/investors/validation";
import { runInvestorMatching } from "@/lib/investors/run-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseRunMatchingBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const client = getSupabaseAdmin();
  try {
    const result = await runInvestorMatching(client, {
      startupProfileId: parsed.value.startup_profile_id ?? null,
      profile: parsed.value.profile,
      topK: parsed.value.topK,
      persist: !!parsed.value.startup_profile_id,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "matching failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
