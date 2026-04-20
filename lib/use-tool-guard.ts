"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { isOnboarded } from "./onboard";
import { syncProfileFromDB } from "./db-user";
import { syncAllToolsToLocalStorage } from "./db-tools";

export function useToolGuard(): { ready: boolean; profileIncomplete: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isLocalOnly } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (loading) return;

    async function check() {
      if (isLocalOnly) {
        // No hard redirect. Tool pages render; incomplete profile surfaces
        // as an in-page banner (see `profileIncomplete` below). /onboard is
        // reachable from the banner's CTA, not forced.
        return;
      }

      if (!user) {
        // Logged-out authenticated mode → login (never /onboard).
        const redirectTo = pathname || "/dashboard";
        router.replace(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (!synced.current) {
        synced.current = true;
        await syncProfileFromDB().catch(() => false);
        await syncAllToolsToLocalStorage().catch(() => undefined);
      }
    }

    check();
  }, [user, loading, isLocalOnly, router, pathname]);

  // ready: the page may render.
  // - authenticated mode: requires a user (guard redirects to login otherwise)
  // - local-only mode: always ready; profile completeness is a soft concern
  const ready = !loading && (isLocalOnly ? true : !!user);
  const profileIncomplete = !loading && !isOnboarded();

  return { ready, profileIncomplete };
}