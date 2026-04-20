import { NextResponse } from "next/server";

// Legacy route. The engine behind this endpoint was replaced by
// /api/matching/simple-run (scoring_version: "simple_v1" | "premium_v2").
// We keep this file so stale client bundles do not 500 — it now returns
// HTTP 410 Gone with a clear pointer to the new endpoint, and never
// invokes the old engine.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "endpoint deprecated — use POST /api/matching/simple-run with scoring_version='premium_v2'",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "endpoint deprecated — use POST /api/matching/simple-run with scoring_version='premium_v2'",
    },
    { status: 410 }
  );
}
