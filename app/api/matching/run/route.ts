import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  parseRunMatchingBody,
  type StartupContextInput,
} from "@/lib/investors/validation";
import { runInvestorMatching } from "@/lib/investors/run-matching";
import type { StartupProfileInput } from "@/lib/investors/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sentinel tag for ephemeral startup_profiles rows created from `startup_context`.
 * Stored in `revenue_model` (a field we'd otherwise leave null) so it's queryable
 * without a schema change. Cleanup script: scripts/cleanup-ephemeral-startup-profiles.sql
 */
const EPHEMERAL_MARKER = "__ephemeral_v2__";

/**
 * Fold the traction object into a narrative if no description was supplied.
 * Matches the v1 formatter so the stored description reads like prose.
 */
function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function synthesizeDescription(ctx: StartupContextInput): string | null {
  const fragments: string[] = [];
  const sector = ctx.sectors?.[0] ?? null;
  if (sector && ctx.stage) fragments.push(`${ctx.stage} ${sector} startup`);
  else if (sector) fragments.push(`${sector} startup`);
  else if (ctx.stage) fragments.push(`${ctx.stage}-stage startup`);
  if (ctx.country) fragments.push(`based in ${ctx.country}`);
  if (ctx.traction.mrr && ctx.traction.mrr >= 100) {
    fragments.push(`${formatUsd(ctx.traction.mrr)} MRR`);
  }
  if (ctx.traction.growth_mom && ctx.traction.growth_mom > 0) {
    fragments.push(`${Math.round(ctx.traction.growth_mom)}% monthly growth`);
  }
  if (ctx.traction.customers && ctx.traction.customers > 0) {
    fragments.push(`${Math.round(ctx.traction.customers)} customers`);
  }
  if (fragments.length === 0) return null;
  return fragments.join(", ") + ".";
}

function contextToProfileInput(ctx: StartupContextInput): StartupProfileInput {
  const description = ctx.description ?? synthesizeDescription(ctx);
  return {
    startup_name: (ctx.startup_name ?? "").trim() || "Untitled startup",
    description,
    country: ctx.country,
    region: ctx.region,
    stage: ctx.stage,
    sectors: ctx.sectors,
    business_model: null,
    target_markets: null,
    revenue_model: null,
    valuation_estimate: ctx.fundraising.valuation_base,
    fundraising_target_usd: ctx.fundraising.target_raise_usd,
  };
}

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
    let startupProfileId = parsed.value.startup_profile_id ?? null;
    let profile: StartupProfileInput | undefined = parsed.value.profile;
    let unifiedStartupId: string | null = null;

    if (!startupProfileId && parsed.value.startup_context) {
      const ctx = parsed.value.startup_context;
      const input = contextToProfileInput(ctx);
      if (!input.startup_name) {
        return NextResponse.json(
          { ok: false, error: "startup_context.startup_name is required" },
          { status: 400 }
        );
      }

      const userId = ctx.user_id?.trim() || null;

      if (userId) {
        // Authenticated unified path: upsert canonical startups row, then
        // ensure a linked startup_profiles row exists for URL back-compat.
        const existing = await client
          .from("startups")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (existing.error) {
          return NextResponse.json(
            { ok: false, error: existing.error.message },
            { status: 500 }
          );
        }

        if (existing.data) {
          unifiedStartupId = (existing.data as { id: string }).id;
        } else {
          const inserted = await client
            .from("startups")
            .insert({
              user_id: userId,
              startup_name: input.startup_name,
              description_short: null,
              description_long: input.description ?? null,
              country: input.country ?? null,
              region: input.region ?? null,
              stage_current: input.stage ?? null,
              business_model: input.business_model ?? null,
              industry_primary: input.sectors?.[0] ?? null,
              status: "active",
              source: "app_cutover_unified",
            })
            .select("id")
            .single();
          if (inserted.error) {
            return NextResponse.json(
              { ok: false, error: inserted.error.message },
              { status: 500 }
            );
          }
          unifiedStartupId = (inserted.data as { id: string }).id;
        }

        // Ensure a linked startup_profiles row for the results URL.
        const linked = await client
          .from("startup_profiles")
          .select("id")
          .eq("user_id", userId)
          .eq("startup_id", unifiedStartupId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (linked.error) {
          return NextResponse.json(
            { ok: false, error: linked.error.message },
            { status: 500 }
          );
        }
        if (linked.data) {
          startupProfileId = (linked.data as { id: string }).id;
        } else {
          const insertedProfile = await client
            .from("startup_profiles")
            .insert({
              user_id: userId,
              startup_id: unifiedStartupId,
              startup_name: input.startup_name,
              description: input.description ?? null,
              country: input.country ?? null,
              region: input.region ?? null,
              stage: input.stage ?? null,
              sectors: input.sectors ?? null,
              business_model: input.business_model ?? null,
              target_markets: input.target_markets ?? null,
              revenue_model: null,
              valuation_estimate: input.valuation_estimate ?? null,
              fundraising_target_usd: input.fundraising_target_usd ?? null,
            })
            .select("id")
            .single();
          if (insertedProfile.error) {
            return NextResponse.json(
              { ok: false, error: insertedProfile.error.message },
              { status: 500 }
            );
          }
          startupProfileId = (insertedProfile.data as { id: string }).id;
        }
        profile = undefined;
      } else {
        // Anon path: keep the ephemeral legacy fallback.
        //
        // SAFEGUARD: ephemeral rows are tagged with the sentinel marker
        // `EPHEMERAL_MARKER` in `revenue_model` so a cleanup job can safely
        // target them (see scripts/cleanup-ephemeral-startup-profiles.sql).
        const { data, error } = await client
          .from("startup_profiles")
          .insert({
            user_id: null,
            startup_name: input.startup_name,
            description: input.description ?? null,
            country: input.country ?? null,
            region: input.region ?? null,
            stage: input.stage ?? null,
            sectors: input.sectors ?? null,
            business_model: input.business_model ?? null,
            target_markets: input.target_markets ?? null,
            revenue_model: EPHEMERAL_MARKER,
            valuation_estimate: input.valuation_estimate ?? null,
            fundraising_target_usd: input.fundraising_target_usd ?? null,
          })
          .select("id")
          .single();
        if (error) {
          return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
          );
        }
        startupProfileId = (data as { id: string }).id;
        profile = undefined;
      }
    }

    const result = await runInvestorMatching(client, {
      startupProfileId,
      profile,
      topK: parsed.value.topK,
      persist: !!startupProfileId,
      writeTarget: unifiedStartupId
        ? {
            kind: "unified",
            startupId: unifiedStartupId,
            contextSnapshot: parsed.value.startup_context ?? null,
          }
        : startupProfileId
        ? { kind: "legacy", startupProfileId }
        : undefined,
    });
    return NextResponse.json({
      ok: true,
      data: { ...result, startup_profile_id: startupProfileId },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "matching failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
