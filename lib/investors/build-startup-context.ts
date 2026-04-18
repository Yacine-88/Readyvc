/**
 * Zero-friction matching (v2): assemble a StartupContext by reading everything
 * the founder has already entered — from Supabase first (when authenticated)
 * and falling back to localStorage on the client. Never throws; always returns
 * a partial build even when most sources are missing.
 */

import { createClient as createBrowserSupabase } from "@/lib/supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StartupContext {
  startup_name: string | null;
  stage: string | null;
  country: string | null;
  region: string | null;
  sectors: string[] | null;
  description: string | null;
  traction: {
    mrr: number | null;
    growth_mom: number | null;
    customers: number | null;
  };
  fundraising: {
    target_raise_usd: number | null;
    valuation_base: number | null;
  };
  readiness_score: number | null;
}

export type ContextSourceKey =
  | "supabase"
  | "founder"
  | "valuation"
  | "metrics"
  | "readiness"
  | "profile";

export interface ContextGap {
  field: string;
  prompt: string;
  href: string;
  toolLabel: string;
}

export interface StartupContextBuild {
  context: StartupContext;
  sources: Record<ContextSourceKey, boolean>;
  missing: ContextGap[];
  isUsable: boolean;
}

// ─── localStorage shapes (partial, defensive) ──────────────────────────────

interface FounderProfileLocal {
  name?: string;
  email?: string;
  startupName?: string;
  country?: string;
  sector?: string;
  stage?: string;
}

interface ValuationLocal {
  score?: number;
  estimated_valuation?: number;
  valuation_low?: number;
  valuation_high?: number;
  sector?: string;
  stage?: string;
  growth_rate?: number;
}

interface MetricsLocal {
  score?: number;
  mrr?: number;
  arr?: number;
  growth_rate?: number;
  ltv_cac?: number;
  churn?: number;
  runway?: number;
  customers?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeReadLocal<T extends object>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as T;
    return null;
  } catch {
    return null;
  }
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

/** Compose an investor-facing description from available signals. */
function buildDescription(parts: {
  sector: string | null;
  stage: string | null;
  country: string | null;
  mrr: number | null;
  arr: number | null;
  growth: number | null;
}): string | null {
  const fragments: string[] = [];
  if (parts.sector && parts.stage) {
    fragments.push(`${parts.stage} ${parts.sector} startup`);
  } else if (parts.sector) {
    fragments.push(`${parts.sector} startup`);
  } else if (parts.stage) {
    fragments.push(`${parts.stage}-stage startup`);
  }
  if (parts.country) fragments.push(`based in ${parts.country}`);
  if (parts.arr && parts.arr >= 1000) {
    fragments.push(`${formatUsd(parts.arr)} ARR`);
  } else if (parts.mrr && parts.mrr >= 100) {
    fragments.push(`${formatUsd(parts.mrr)} MRR`);
  }
  if (parts.growth && parts.growth > 0) {
    fragments.push(`${Math.round(parts.growth)}% monthly growth`);
  }
  if (fragments.length === 0) return null;
  return fragments.join(", ") + ".";
}

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VCREADY_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_VCREADY_SUPABASE_ANON_KEY
  );
}

/** Best-effort first-row fetch. Never throws. Returns null if anything fails. */
async function tryFetchLatest<T>(
  client: SupabaseClient | null,
  table: string,
  columns: string,
  userId: string,
  orderCol = "calculated_at"
): Promise<T | null> {
  if (!client) return null;
  try {
    const res = await client
      .from(table)
      .select(columns)
      .eq("user_id", userId)
      .order(orderCol, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.error) return null;
    return (res.data as T | null) ?? null;
  } catch {
    return null;
  }
}

async function tryFetchLatestMulti<T>(
  client: SupabaseClient | null,
  table: string,
  columns: string,
  userId: string,
  orderCols: string[]
): Promise<T | null> {
  for (const col of orderCols) {
    const row = await tryFetchLatest<T>(client, table, columns, userId, col);
    if (row) return row;
  }
  return null;
}

// ─── Main API ──────────────────────────────────────────────────────────────

interface SupaStartupProfile {
  startup_name: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  stage: string | null;
  sectors: unknown;
  business_model: string | null;
  target_markets: unknown;
  valuation_estimate: number | null;
  fundraising_target_usd: number | null;
}

interface SupaFounderProfile {
  startup_name: string | null;
  country: string | null;
  sector: string | null;
  stage: string | null;
}

interface SupaValuation {
  estimated_valuation: number | null;
  stage: string | null;
  growth_rate: number | null;
}

interface SupaMetrics {
  monthly_revenue: number | null;
  monthly_growth_rate: number | null;
}

interface SupaReadiness {
  overall_score: number | null;
}

function asStringArray(v: unknown): string[] | null {
  if (Array.isArray(v)) {
    const out = v
      .filter((x) => typeof x === "string")
      .map((x) => (x as string).trim())
      .filter((x) => x.length > 0);
    return out.length > 0 ? out : null;
  }
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return null;
}

/**
 * Build a StartupContext by reading Supabase (when a userId is provided and
 * Supabase is configured) and merging localStorage fallbacks when running on
 * the client. Never throws.
 *
 * Priority for sector/stage (most-recent / most-specific wins):
 *   startup_profiles → valuations → founder_profiles → founder localStorage
 *   → valuation localStorage
 */
export async function buildStartupContext(
  userId: string | null,
  client?: SupabaseClient
): Promise<StartupContextBuild> {
  const sources: Record<ContextSourceKey, boolean> = {
    supabase: false,
    founder: false,
    valuation: false,
    metrics: false,
    readiness: false,
    profile: false,
  };

  // ---- Supabase path (if we have a user and env is configured) ------------
  let supa: SupabaseClient | null = null;
  if (userId && isSupabaseConfigured()) {
    try {
      supa = client ?? (createBrowserSupabase() as unknown as SupabaseClient);
      sources.supabase = true;
    } catch {
      supa = null;
      sources.supabase = false;
    }
  }

  let sbStartupProfile: SupaStartupProfile | null = null;
  let sbFounder: SupaFounderProfile | null = null;
  let sbValuation: SupaValuation | null = null;
  let sbMetrics: SupaMetrics | null = null;
  let sbReadiness: SupaReadiness | null = null;

  if (supa && userId) {
    sbStartupProfile = await tryFetchLatestMulti<SupaStartupProfile>(
      supa,
      "startup_profiles",
      "startup_name, description, country, region, stage, sectors, business_model, target_markets, valuation_estimate, fundraising_target_usd",
      userId,
      ["updated_at", "created_at"]
    );
    sbFounder = await tryFetchLatestMulti<SupaFounderProfile>(
      supa,
      "founder_profiles",
      "startup_name, country, sector, stage",
      userId,
      ["updated_at", "created_at"]
    );
    sbValuation = await tryFetchLatestMulti<SupaValuation>(
      supa,
      "valuations",
      "estimated_valuation, stage, growth_rate",
      userId,
      ["calculated_at", "updated_at", "created_at"]
    );
    sbMetrics = await tryFetchLatestMulti<SupaMetrics>(
      supa,
      "metrics",
      "monthly_revenue, monthly_growth_rate",
      userId,
      ["calculated_at", "updated_at", "created_at"]
    );
    sbReadiness = await tryFetchLatestMulti<SupaReadiness>(
      supa,
      "readiness_history",
      "overall_score",
      userId,
      ["created_at"]
    );
    if (!sbReadiness) {
      sbReadiness = await tryFetchLatestMulti<SupaReadiness>(
        supa,
        "readiness_scores",
        "overall_score",
        userId,
        ["calculated_at", "updated_at", "created_at"]
      );
    }
  }

  sources.profile = !!sbStartupProfile;
  sources.founder = !!sbFounder;
  sources.valuation = !!sbValuation;
  sources.metrics = !!sbMetrics;
  sources.readiness = !!sbReadiness;

  // ---- localStorage fallback (client only) --------------------------------
  const lsFounder = safeReadLocal<FounderProfileLocal>("vcready_founder");
  const lsVal = safeReadLocal<ValuationLocal>("vcready_valuation");
  const lsMet = safeReadLocal<MetricsLocal>("vcready_metrics");

  if (!sources.founder && lsFounder) sources.founder = true;
  if (!sources.valuation && lsVal && (lsVal.score ?? 0) > 0) {
    sources.valuation = true;
  } else if (!sources.valuation && lsVal?.estimated_valuation) {
    sources.valuation = true;
  }
  if (!sources.metrics && lsMet && ((lsMet.score ?? 0) > 0 || lsMet.mrr || lsMet.arr)) {
    sources.metrics = true;
  }

  // ---- Merge (priority order) ---------------------------------------------
  const startup_name =
    trimOrNull(sbStartupProfile?.startup_name) ??
    trimOrNull(sbFounder?.startup_name) ??
    trimOrNull(lsFounder?.startupName);

  const country =
    trimOrNull(sbStartupProfile?.country) ??
    trimOrNull(sbFounder?.country) ??
    trimOrNull(lsFounder?.country);

  const region = trimOrNull(sbStartupProfile?.region);

  const stage =
    trimOrNull(sbStartupProfile?.stage) ??
    trimOrNull(sbValuation?.stage) ??
    trimOrNull(sbFounder?.sector ? sbFounder?.stage : null) ??
    trimOrNull(sbFounder?.stage) ??
    trimOrNull(lsFounder?.stage) ??
    trimOrNull(lsVal?.stage);

  // sectors: startup_profiles list → founder.sector → localStorage
  let sectors: string[] | null = asStringArray(sbStartupProfile?.sectors);
  if (!sectors) {
    const fs = trimOrNull(sbFounder?.sector);
    if (fs) sectors = [fs];
  }
  if (!sectors) {
    const vs = trimOrNull(lsVal?.sector);
    if (vs) sectors = [vs];
  }
  if (!sectors) {
    const fls = trimOrNull(lsFounder?.sector);
    if (fls) sectors = [fls];
  }

  // traction
  const mrr =
    numberOrNull(sbMetrics?.monthly_revenue) ?? numberOrNull(lsMet?.mrr);
  const arr = numberOrNull(lsMet?.arr);
  const growth_mom =
    numberOrNull(sbMetrics?.monthly_growth_rate) ??
    numberOrNull(sbValuation?.growth_rate) ??
    numberOrNull(lsMet?.growth_rate) ??
    numberOrNull(lsVal?.growth_rate);
  const customers = numberOrNull(lsMet?.customers);

  // fundraising
  const target_raise_usd = numberOrNull(
    sbStartupProfile?.fundraising_target_usd
  );
  const valuation_base =
    numberOrNull(sbStartupProfile?.valuation_estimate) ??
    numberOrNull(sbValuation?.estimated_valuation) ??
    numberOrNull(lsVal?.estimated_valuation);

  // description: stored narrative wins, otherwise synthesize
  const description =
    trimOrNull(sbStartupProfile?.description) ??
    buildDescription({
      sector: sectors?.[0] ?? null,
      stage,
      country,
      mrr,
      arr,
      growth: growth_mom,
    });

  const readiness_score = numberOrNull(sbReadiness?.overall_score);

  const context: StartupContext = {
    startup_name,
    stage,
    country,
    region,
    sectors,
    description,
    traction: {
      mrr,
      growth_mom,
      customers,
    },
    fundraising: {
      target_raise_usd,
      valuation_base,
    },
    readiness_score,
  };

  // ---- Collect gaps -------------------------------------------------------
  const missing: ContextGap[] = [];
  if (!startup_name) {
    missing.push({
      field: "startup_name",
      prompt: "Add your startup name and country so matching can tailor geography.",
      href: "/onboard",
      toolLabel: "Complete onboarding",
    });
  }
  if (!sectors || sectors.length === 0) {
    missing.push({
      field: "sector",
      prompt: "Pick your sector in the Valuation tool to surface sector-aligned investors.",
      href: "/valuation",
      toolLabel: "Open Valuation",
    });
  }
  if (!stage) {
    missing.push({
      field: "stage",
      prompt: "Set your funding stage so we can weight stage-appropriate investors.",
      href: "/valuation",
      toolLabel: "Open Valuation",
    });
  }
  if (!sources.metrics) {
    missing.push({
      field: "metrics",
      prompt: "Add your metrics to improve matching accuracy.",
      href: "/metrics",
      toolLabel: "Open Metrics",
    });
  }

  const isUsable = Boolean(
    startup_name && ((sectors && sectors.length > 0) || stage || country)
  );

  return { context, sources, missing, isUsable };
}
