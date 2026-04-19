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

  // Accept both our manually-named vars and the names set automatically by
  // the Vercel ↔ Supabase integration, so the same code works across local,
  // preview, and production without renaming env vars in the dashboard.
  const url =
    process.env.NEXT_PUBLIC_VCREADY_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires a URL " +
        "(NEXT_PUBLIC_VCREADY_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_URL) " +
        "and a service key " +
        "(SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, or SUPABASE_SECRET_KEY)."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "vcready-import" } },
  });
  return cached;
}
