/**
 * Tiny manual validators. No zod — just type guards and explicit checks.
 * Each returns a discriminated union so callers can branch on `ok`.
 */

import type { StartupProfileInput } from "./types";

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function strOrNull(
  v: unknown,
  field: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, error: `${field} must be a string` };
  const t = v.trim();
  return { ok: true, value: t.length ? t : null };
}

function numOrNull(
  v: unknown,
  field: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v === "number" && Number.isFinite(v)) return { ok: true, value: v };
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return { ok: true, value: n };
  }
  return { ok: false, error: `${field} must be a number` };
}

function arrOrNull(
  v: unknown,
  field: string
): { ok: true; value: string[] | null } | { ok: false; error: string } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (!Array.isArray(v)) return { ok: false, error: `${field} must be an array of strings` };
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return { ok: false, error: `${field} items must be strings` };
    const t = item.trim();
    if (t) out.push(t);
  }
  return { ok: true, value: out };
}

export function parseStartupProfileBody(
  body: unknown
): Validated<StartupProfileInput> {
  if (!isObj(body)) return { ok: false, error: "Body must be a JSON object" };

  const name = body.startup_name;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: "startup_name is required" };
  }

  const fields = {
    user_id: strOrNull(body.user_id, "user_id"),
    description: strOrNull(body.description, "description"),
    country: strOrNull(body.country, "country"),
    region: strOrNull(body.region, "region"),
    stage: strOrNull(body.stage, "stage"),
    business_model: strOrNull(body.business_model, "business_model"),
    revenue_model: strOrNull(body.revenue_model, "revenue_model"),
    sectors: arrOrNull(body.sectors, "sectors"),
    target_markets: arrOrNull(body.target_markets, "target_markets"),
    valuation_estimate: numOrNull(body.valuation_estimate, "valuation_estimate"),
    fundraising_target_usd: numOrNull(
      body.fundraising_target_usd,
      "fundraising_target_usd"
    ),
  };
  for (const [k, v] of Object.entries(fields)) {
    if (!v.ok) return { ok: false, error: v.error };
    void k;
  }

  const out: StartupProfileInput = {
    startup_name: name.trim(),
    user_id: (fields.user_id as { ok: true; value: string | null }).value,
    description: (fields.description as { ok: true; value: string | null }).value,
    country: (fields.country as { ok: true; value: string | null }).value,
    region: (fields.region as { ok: true; value: string | null }).value,
    stage: (fields.stage as { ok: true; value: string | null }).value,
    business_model: (fields.business_model as { ok: true; value: string | null }).value,
    revenue_model: (fields.revenue_model as { ok: true; value: string | null }).value,
    sectors: (fields.sectors as { ok: true; value: string[] | null }).value,
    target_markets: (fields.target_markets as { ok: true; value: string[] | null }).value,
    valuation_estimate: (fields.valuation_estimate as { ok: true; value: number | null }).value,
    fundraising_target_usd: (fields.fundraising_target_usd as { ok: true; value: number | null })
      .value,
  };
  return { ok: true, value: out };
}

export interface StartupContextInput {
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

export interface RunMatchingBody {
  startup_profile_id?: string;
  profile?: StartupProfileInput;
  startup_context?: StartupContextInput;
  topK?: number;
}

function parseStartupContext(body: unknown): Validated<StartupContextInput> {
  if (!isObj(body)) return { ok: false, error: "startup_context must be an object" };

  const name = strOrNull(body.startup_name, "startup_name");
  if (!name.ok) return name;
  const stage = strOrNull(body.stage, "stage");
  if (!stage.ok) return stage;
  const country = strOrNull(body.country, "country");
  if (!country.ok) return country;
  const region = strOrNull(body.region, "region");
  if (!region.ok) return region;
  const description = strOrNull(body.description, "description");
  if (!description.ok) return description;
  const sectors = arrOrNull(body.sectors, "sectors");
  if (!sectors.ok) return sectors;

  const tractionIn = isObj(body.traction) ? body.traction : {};
  const mrr = numOrNull(tractionIn.mrr, "traction.mrr");
  if (!mrr.ok) return mrr;
  const growth = numOrNull(tractionIn.growth_mom, "traction.growth_mom");
  if (!growth.ok) return growth;
  const customers = numOrNull(tractionIn.customers, "traction.customers");
  if (!customers.ok) return customers;

  const fundIn = isObj(body.fundraising) ? body.fundraising : {};
  const target = numOrNull(fundIn.target_raise_usd, "fundraising.target_raise_usd");
  if (!target.ok) return target;
  const valBase = numOrNull(fundIn.valuation_base, "fundraising.valuation_base");
  if (!valBase.ok) return valBase;

  const readiness = numOrNull(body.readiness_score, "readiness_score");
  if (!readiness.ok) return readiness;

  return {
    ok: true,
    value: {
      startup_name: name.value,
      stage: stage.value,
      country: country.value,
      region: region.value,
      sectors: sectors.value,
      description: description.value,
      traction: {
        mrr: mrr.value,
        growth_mom: growth.value,
        customers: customers.value,
      },
      fundraising: {
        target_raise_usd: target.value,
        valuation_base: valBase.value,
      },
      readiness_score: readiness.value,
    },
  };
}

export function parseRunMatchingBody(body: unknown): Validated<RunMatchingBody> {
  if (!isObj(body)) return { ok: false, error: "Body must be a JSON object" };

  const out: RunMatchingBody = {};

  if (body.startup_profile_id !== undefined && body.startup_profile_id !== null) {
    if (typeof body.startup_profile_id !== "string" || !body.startup_profile_id.trim()) {
      return { ok: false, error: "startup_profile_id must be a non-empty string" };
    }
    out.startup_profile_id = body.startup_profile_id.trim();
  }

  if (body.profile !== undefined && body.profile !== null) {
    const parsed = parseStartupProfileBody(body.profile);
    if (!parsed.ok) return parsed;
    out.profile = parsed.value;
  }

  if (body.startup_context !== undefined && body.startup_context !== null) {
    const parsed = parseStartupContext(body.startup_context);
    if (!parsed.ok) return parsed;
    out.startup_context = parsed.value;
  }

  if (!out.startup_profile_id && !out.profile && !out.startup_context) {
    return {
      ok: false,
      error: "Provide startup_profile_id, profile, or startup_context",
    };
  }

  if (body.topK !== undefined && body.topK !== null) {
    if (typeof body.topK !== "number" || !Number.isFinite(body.topK) || body.topK <= 0) {
      return { ok: false, error: "topK must be a positive number" };
    }
    out.topK = Math.floor(body.topK);
  }

  return { ok: true, value: out };
}

export interface InvestorsListQuery {
  search: string | null;
  region: string | null;
  country: string | null;
  sector: string | null;
  stage: string | null;
  minActivity: number | null;
  page: number;
  pageSize: number;
  sort: "activity_desc" | "name_asc" | "deals_desc";
}

const MAX_PAGE_SIZE = 100;

export function parseInvestorsListQuery(
  searchParams: URLSearchParams
): Validated<InvestorsListQuery> {
  const sortRaw = (searchParams.get("sort") ?? "activity_desc").toLowerCase();
  if (
    sortRaw !== "activity_desc" &&
    sortRaw !== "name_asc" &&
    sortRaw !== "deals_desc"
  ) {
    return { ok: false, error: "invalid sort" };
  }

  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "25");
  let pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1 ? Math.floor(pageSizeRaw) : 25;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  const minActivityRaw = searchParams.get("minActivity");
  let minActivity: number | null = null;
  if (minActivityRaw != null && minActivityRaw !== "") {
    const n = Number(minActivityRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "minActivity must be a non-negative number" };
    }
    minActivity = n;
  }

  return {
    ok: true,
    value: {
      search: (searchParams.get("search") ?? "").trim() || null,
      region: (searchParams.get("region") ?? "").trim() || null,
      country: (searchParams.get("country") ?? "").trim() || null,
      sector: (searchParams.get("sector") ?? "").trim() || null,
      stage: (searchParams.get("stage") ?? "").trim() || null,
      minActivity,
      page,
      pageSize,
      sort: sortRaw,
    },
  };
}
