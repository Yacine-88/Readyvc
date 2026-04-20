/**
 * Typed fetch wrappers for the 6 Investor Intelligence API routes.
 * Each call returns the parsed `data` payload, or throws Error with the
 * server's `error` string when the envelope reports failure.
 */

import type {
  RankedMatch,
  StartupProfileInput,
} from "./types";
import type {
  InvestorDetailPayload,
  InvestorFilterState,
  InvestorsListResponse,
  SavedMatchRow,
  StartupProfileRecord,
} from "./ui-types";

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function isEnvelope(v: unknown): v is Envelope<unknown> {
  return typeof v === "object" && v !== null && "ok" in v;
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Unexpected response (${res.status})`);
  }
  if (!isEnvelope(body)) {
    throw new Error(`Malformed response (${res.status})`);
  }
  if (!body.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}

// ─── Investors ──────────────────────────────────────────────────────────────

export interface ListInvestorsParams {
  search?: string;
  region?: string;
  country?: string;
  sector?: string;
  stage?: string;
  minActivity?: number | string;
  page?: number;
  pageSize?: number;
  sort?: InvestorFilterState["sort"];
}

export function buildInvestorsListQuery(
  params: ListInvestorsParams
): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.region) qs.set("region", params.region);
  if (params.country) qs.set("country", params.country);
  if (params.sector) qs.set("sector", params.sector);
  if (params.stage) qs.set("stage", params.stage);
  if (params.minActivity !== undefined && params.minActivity !== "") {
    qs.set("minActivity", String(params.minActivity));
  }
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.sort) qs.set("sort", params.sort);
  return qs;
}

export async function listInvestors(
  params: ListInvestorsParams = {}
): Promise<InvestorsListResponse> {
  const qs = buildInvestorsListQuery(params);
  const res = await fetch(`/api/investors?${qs.toString()}`, {
    cache: "no-store",
  });
  return parseEnvelope<InvestorsListResponse>(res);
}

export async function getInvestor(id: string): Promise<InvestorDetailPayload> {
  const res = await fetch(`/api/investors/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  return parseEnvelope<InvestorDetailPayload>(res);
}

// ─── Startup profiles ───────────────────────────────────────────────────────

export async function createStartupProfile(
  body: StartupProfileInput
): Promise<StartupProfileRecord> {
  const res = await fetch(`/api/startup-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  return parseEnvelope<StartupProfileRecord>(res);
}

export async function getStartupProfile(
  id: string
): Promise<StartupProfileRecord> {
  const res = await fetch(`/api/startup-profiles/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  return parseEnvelope<StartupProfileRecord>(res);
}

// ─── Matching ───────────────────────────────────────────────────────────────

export interface RunMatchingBody {
  startup_profile_id?: string;
  profile?: StartupProfileInput;
  topK?: number;
}

// simple-run returns { ok, data: [...investors], startup_profile_id }.
// We expose both the matches array and the id that the route actually
// persisted matches under, so the UI can redirect to the correct row.
export interface RunMatchingResponse {
  matches: unknown[];
  startup_profile_id: string | null;
}

export async function runMatching(
  body: RunMatchingBody
): Promise<RunMatchingResponse> {
  const p = body.profile ?? ({} as Partial<StartupProfileInput>);
  const simplePayload = {
    scoring_version: "premium_v2",
    stage: p.stage ?? null,
    sectors: p.sectors ?? null,
    country: p.country ?? null,
    region: p.region ?? null,
    // identity — persisted in ephemeral row so the results page displays
    // the founder's actual data instead of a generated run name.
    startup_name: p.startup_name ?? null,
    description: p.description ?? null,
    business_model: p.business_model ?? null,
    target_markets: p.target_markets ?? null,
    valuation_estimate: p.valuation_estimate ?? null,
    fundraising_target_usd: p.fundraising_target_usd ?? null,
  };
  const res = await fetch(`/api/matching/simple-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(simplePayload),
  });
  // Do NOT use parseEnvelope — it throws on shape mismatches. We only want to
  // surface an error when the server explicitly returns ok === false.
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    // JSON parse failure is not a matching failure — treat as empty result.
    return { matches: [], startup_profile_id: null };
  }
  const env =
    parsed && typeof parsed === "object"
      ? (parsed as {
          ok?: unknown;
          data?: unknown;
          error?: unknown;
          startup_profile_id?: unknown;
        })
      : {};
  if (env.ok === false) {
    const msg = typeof env.error === "string" && env.error
      ? env.error
      : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return {
    matches: Array.isArray(env.data) ? env.data : [],
    startup_profile_id:
      typeof env.startup_profile_id === "string"
        ? env.startup_profile_id
        : null,
  };
}

export async function getSavedMatches(
  startupProfileId: string
): Promise<SavedMatchRow[]> {
  const res = await fetch(
    `/api/matching/${encodeURIComponent(startupProfileId)}`,
    { cache: "no-store" }
  );
  return parseEnvelope<SavedMatchRow[]>(res);
}
