import { getFounderProfile, saveFounderProfile } from "@/lib/onboard";
import { getLocalReadinessScore } from "@/lib/local-readiness";
import { createClient } from "@/lib/supabase-client";
import type { FounderStartupProfile } from "./types";

const FOUNDATION_PROFILE_KEY = "vcready_foundation_profile";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function countCompletedToolsFromScores(scores: {
  metrics_score: number;
  valuation_score: number;
  qa_score: number;
  cap_table_score: number;
  pitch_score: number;
  dataroom_score: number;
}): number {
  return [
    scores.metrics_score,
    scores.valuation_score,
    scores.qa_score,
    scores.cap_table_score,
    scores.pitch_score,
    scores.dataroom_score,
  ].filter((score) => score > 0).length;
}

export function getProfileCompletionPct(profile: FounderStartupProfile): number {
  const fields = [
    profile.founder_name,
    profile.founder_email,
    profile.startup_name,
    profile.country,
    profile.sector,
    profile.stage,
  ];

  const filled = fields.filter((field) => field.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function buildUnifiedProfileFromLegacySources(): FounderStartupProfile {
  const founder = getFounderProfile();
  const readiness = getLocalReadinessScore();
  const previous = safeRead<FounderStartupProfile | null>(FOUNDATION_PROFILE_KEY, null);
  const now = new Date().toISOString();

  const profile: FounderStartupProfile = {
    founder_name: founder?.name ?? previous?.founder_name ?? "",
    founder_email: founder?.email ?? previous?.founder_email ?? "",
    startup_name: founder?.startupName ?? previous?.startup_name ?? "",
    country: founder?.country ?? previous?.country ?? "",
    sector: founder?.sector ?? readiness.sector ?? previous?.sector ?? "",
    stage: founder?.stage ?? readiness.stage ?? previous?.stage ?? "",
    has_raised_before: founder?.hasRaisedBefore ?? previous?.has_raised_before ?? false,

    arr: readiness.arr ?? previous?.arr ?? 0,
    mrr: readiness.mrr ?? previous?.mrr ?? 0,
    growth_rate: readiness.growth_rate ?? previous?.growth_rate ?? 0,
    runway: readiness.runway ?? previous?.runway ?? 0,
    estimated_valuation:
      readiness.estimated_valuation ?? previous?.estimated_valuation ?? 0,

    completed_tools_count: countCompletedToolsFromScores(readiness),
    overall_score: readiness.overall_score ?? previous?.overall_score ?? 0,

    created_at: previous?.created_at ?? founder?.createdAt ?? now,
    updated_at: now,
  };

  return profile;
}

export function getUnifiedProfile(): FounderStartupProfile {
  const existing = safeRead<FounderStartupProfile | null>(FOUNDATION_PROFILE_KEY, null);
  return existing ?? buildUnifiedProfileFromLegacySources();
}

export function saveUnifiedProfile(profile: FounderStartupProfile): FounderStartupProfile {
  const next: FounderStartupProfile = {
    ...profile,
    updated_at: new Date().toISOString(),
  };

  safeWrite(FOUNDATION_PROFILE_KEY, next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
  }

  // C1: also persist to Supabase — fire-and-forget, never blocks
  void (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("founder_profiles").upsert({
        user_id: user.id,
        name: next.founder_name,
        email: next.founder_email,
        startup_name: next.startup_name,
        country: next.country || null,
        sector: next.sector || null,
        stage: next.stage || null,
        has_raised_before: next.has_raised_before,
        updated_at: next.updated_at,
      }, { onConflict: "user_id" });
    } catch {}
  })();

  return next;
}

/**
 * C1: Sync profile from Supabase into localStorage.
 * Call this once on dashboard mount before reading sync profile functions.
 * If DB has data → overwrites localStorage. If DB empty → migrates localStorage → DB.
 */
export async function syncProfileFromDB(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("founder_profiles")
      .select("name, email, startup_name, country, sector, stage, has_raised_before, updated_at")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      // DB has data — populate localStorage so sync functions see it
      saveFounderProfile({
        name: data.name,
        email: data.email,
        startupName: data.startup_name,
        country: data.country ?? "",
        sector: data.sector ?? "",
        stage: data.stage ?? "",
        hasRaisedBefore: data.has_raised_before ?? false,
      });
    } else {
      // DB empty — migrate localStorage → DB (one-shot, best effort)
      const local = getFounderProfile();
      if (local) {
        await supabase.from("founder_profiles").upsert({
          user_id: user.id,
          name: local.name,
          email: local.email,
          startup_name: local.startupName,
          country: local.country || null,
          sector: local.sector || null,
          stage: local.stage || null,
          has_raised_before: local.hasRaisedBefore,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }
  } catch {}
}

export function refreshUnifiedProfile(): FounderStartupProfile {
  const profile = buildUnifiedProfileFromLegacySources();
  return saveUnifiedProfile(profile);
}