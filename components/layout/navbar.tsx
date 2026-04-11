"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getFounderProfile } from "@/lib/onboard";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/dashboard",    labelKey: "nav.dashboard"    as const },
  { href: "/tools",        labelKey: "nav.tools"        as const },
  { href: "/comparables",  labelKey: "nav.comparables"  as const },
  { href: "/about",        labelKey: "nav.about"        as const },
];

export function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { t }     = useI18n();
  const { user, signOut, loading, isLocalOnly } = useAuth();

  const [firstName,    setFirstName]    = useState<string | null>(null);
  const [startupName,  setStartupName]  = useState<string | null>(null);

  // Sync display name from localStorage on mount, auth changes, and profile saves
  useEffect(() => {
    function syncFromStorage() {
      const profile = getFounderProfile();
      if (profile) {
        setFirstName(profile.name.split(" ")[0]);
        setStartupName(profile.startupName);
      } else {
        setFirstName(null);
        setStartupName(null);
      }
    }
    syncFromStorage();
    window.addEventListener("vcready:profile-updated", syncFromStorage);
    return () => window.removeEventListener("vcready:profile-updated", syncFromStorage);
  }, [user, loading]);

  async function handleSignOut() {
    await signOut();
    if (typeof window !== "undefined") {
      const allKeys = Object.keys(localStorage).filter(
        (k) => k.startsWith("vcready_") || k === "dataroom_results"
      );
      allKeys.forEach((k) => localStorage.removeItem(k));
    }
    setFirstName(null);
    setStartupName(null);
    router.push("/");
  }

  // ── Auth state derivation ─────────────────────────────────────────────────
  // In local-only mode: authenticated = has a local profile (isOnboarded)
  // In Supabase mode:   authenticated = has a real session (user !== null)
  const isAuthenticated = isLocalOnly ? !!firstName : !!user;
  const showConnected   = isAuthenticated && !!firstName;
  // Authenticated but no profile in localStorage yet (e.g. after login before DB sync)
  const showAuthNoProfile = isAuthenticated && !firstName;

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background">
      <div className="max-w-[var(--container-max)] mx-auto px-6 h-full flex items-center justify-between">

        {/* Left: Branding */}
        <Link href="/" className="shrink-0 text-sm font-bold tracking-tight">
          VCReady
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right: Auth state */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loading && !isLocalOnly ? (
            <div className="w-20 h-7 bg-soft rounded-full animate-pulse" />
          ) : showConnected ? (
            <>
              {/* Account pill → dashboard */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 h-8 px-3 rounded-full border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/30 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {firstName![0].toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {startupName ?? firstName}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-xs text-muted hover:text-ink transition-colors font-medium"
              >
                Sign out
              </button>
            </>
          ) : showAuthNoProfile ? (
            <>
              <Link
                href="/onboard"
                className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-soft text-xs font-bold text-ink hover:border-ink/30 transition-colors"
              >
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-xs text-muted hover:text-ink transition-colors font-medium"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Button href="/auth/login" variant="secondary" size="sm">
                Log in
              </Button>
              <Button href="/onboard" variant="primary" size="sm">
                Sign up →
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
