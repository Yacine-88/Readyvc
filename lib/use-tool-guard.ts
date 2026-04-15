"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { isOnboarded } from "./onboard";
import { syncProfileFromDB } from "./db-user";
import { syncAllToolsToLocalStorage } from "./db-tools";

export function useToolGuard(): { ready: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isLocalOnly } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (loading) return;

    async function check() {
      if (isLocalOnly) {
        if (!isOnboarded()) {
          router.replace("/onboard");
        }
        return;
      }

      if (!user) {
        const redirectTo = pathname || "/dashboard-v2";
        router.replace(
          isOnboarded()
            ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`
            : "/onboard"
        );
        return;
      }

      if (!synced.current) {
        synced.current = true;
        await syncProfileFromDB();
        await syncAllToolsToLocalStorage();
      }

      if (!isOnboarded()) {
        router.replace("/onboard");
      }
    }

    check();
  }, [user, loading, isLocalOnly, router, pathname]);

  const ready =
    !loading &&
    (isLocalOnly ? isOnboarded() : !!user && isOnboarded());

  return { ready };
}