/**
 * Founder profile persistence in Supabase.
 * Falls back gracefully when user is not authenticated.
 */

import { createClient } from "./supabase-client";
import { saveFounderProfile, getFounderProfile, type FounderProfile } from "./onboard";

interface DBProfile {
  name: string;
  email: string;
  startup_name: string;
  country?: string;
  sector?: string;
  stage?: string;
  has_raised_before?: boolean;
}

/** Save founder profile to Supabase (upsert). Also writes to localStorage. */
export async function saveProfileToDB(profile: Omit<FounderProfile, "createdAt">): Promise<void> {
  // Always write to localStorage
  saveFounderProfile(profile);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const dbProfile: DBProfile = {
    name: profile.name,
    email: profile.email,
    startup_name: profile.startupName,
    country: profile.country,
    sector: profile.sector,
    stage: profile.stage,
    has_raised_before: profile.hasRaisedBefore,
  };

  await supabase
    .from("founder_profiles")
    .upsert({ ...dbProfile, user_id: user.id, updated_at: new Date().toISOString() }, {
      onConflict: "user_id",
    })
    .select();
}

/** Fetch profile from DB and sync to localStorage. Returns true if synced. */
export async function syncProfileFromDB(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("founder_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return false;

  const profile: Omit<FounderProfile, "createdAt"> = {
    name: data.name,
    email: data.email,
    startupName: data.startup_name,
    country: data.country ?? "",
    sector: data.sector ?? "",
    stage: data.stage ?? "",
    hasRaisedBefore: data.has_raised_before ?? false,
  };

  saveFounderProfile(profile);
  return true;
}

/** True if a DB profile exists for the current user. */
export async function hasDBProfile(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("founder_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return !!data;
}
