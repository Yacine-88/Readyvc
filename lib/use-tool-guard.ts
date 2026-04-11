"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { isOnboarded } from "./onboard";
import { syncProfileFromDB } from "./db-user";
import { syncAllToolsToLocalStorage } from "./db-tools";

/**
 * Shared auth guard for all tool pages.
 *
 * Drop this at the top of any tool page component:
 *   useToolGuard();
 *
 * Behaviour:
 *  - Local-only mode (no Supabase): redirect to /onboard if no profile
 *  - Supabase mode: redirect to /auth/login (returning) or /onboard (new)
 *    if no session; sync DB → localStorage on first authenticated mount
 *
 * Returns { ready } — render nothing until ready is true.
 */
export function useToolGuard(): { ready: boolean } {
  const router   = useRouter();
  const { user, loading, isLocalOnly } = useAuth();
  const synced   = useRef(false);

  useEffect(() => {
    if (loading) return;

    async function check() {
      if (isLocalOnly) {
        if (!isOnboarded()) router.replace("/onboard");
        return;
      }

      if (!user) {
        router.replace(isOnboarded() ? "/auth/login" : "/onboard");
        return;
      }

      if (!synced.current) {
        synced.current = true;
        await syncProfileFromDB();
        await syncAllToolsToLocalStorage();
      }

      if (!isOnboarded()) router.replace("/onboard");
    }

    check();
  }, [user, loading, isLocalOnly, router]);

  // ready = auth resolved AND user is allowed in
  const ready =
    !loading &&
    (isLocalOnly ? isOnboarded() : !!user && isOnboarded());

  return { ready };
}
