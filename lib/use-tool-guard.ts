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
        // Always redirect to login — never to /onboard.
        // /onboard is only for new users actively signing up, not for returning
        // users who are logged out (even if their localStorage is empty).
        const redirectTo = pathname || "/dashboard";
        router.replace(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (!synced.current) {
        synced.current = true;
        await syncProfileFromDB().catch(() => false);
        await syncAllToolsToLocalStorage().catch(() => undefined);
      }

      // utilisateur connecté = accès autorisé
      // même si le profil founder n'est pas encore sync côté local
    }

    check();
  }, [user, loading, isLocalOnly, router, pathname]);

  const ready =
    !loading &&
    (isLocalOnly ? isOnboarded() : !!user);

  return { ready };
}