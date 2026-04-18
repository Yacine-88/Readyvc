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
import type { StartupContext } from "./build-startup-context";

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
  startup_context?: StartupContext;
  topK?: number;
}

export interface RunMatchingResponse {
  profile: {
    startup_profile_id?: string | null;
    startup_name: string;
    country: string | null;
    region: string | null;
    stage: string;
    sectors: string[];
    business_model: string | null;
    target_markets: string[];
    fundraising_target_usd: number | null;
  };
  matches: RankedMatch[];
  saved: number;
  startup_profile_id?: string | null;
}

export async function runMatching(
  body: RunMatchingBody
): Promise<RunMatchingResponse> {
  const res = await fetch(`/api/matching/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  return parseEnvelope<RunMatchingResponse>(res);
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
