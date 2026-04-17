/**
 * Server-side Supabase admin client using the service-role key.
 *
 * Import this ONLY from Node scripts (e.g. `scripts/*.ts`) or server-only
 * code paths. Never import it from a `"use client"` component — the
 * service-role key bypasses RLS.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) " +
        "and SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "vcready-import" } },
  });
  return cached;
}
