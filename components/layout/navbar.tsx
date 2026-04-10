"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getFounderProfile } from "@/lib/onboard";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/dashboard", labelKey: "nav.dashboard" as const },
  { href: "/tools",     labelKey: "nav.tools"     as const },
  { href: "/comparables", labelKey: "nav.comparables" as const },
  { href: "/about",     labelKey: "nav.about"     as const },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { user, signOut, loading } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);

  // Get display name from localStorage profile (fast, works without DB round-trip)
  useEffect(() => {
    const profile = getFounderProfile();
    if (profile) setFirstName(profile.name.split(" ")[0]);
  }, []);

  // Also update when auth state changes (e.g. after login)
  useEffect(() => {
    if (user) {
      const profile = getFounderProfile();
      if (profile) setFirstName(profile.name.split(" ")[0]);
    } else if (!loading) {
      setFirstName(null);
    }
  }, [user, loading]);

  async function handleSignOut() {
    await signOut();
    // Clear local data on sign-out so next user starts fresh
    if (typeof window !== "undefined") {
      const keysToKeep: string[] = []; // preserve nothing — full logout
      const allKeys = Object.keys(localStorage).filter((k) => k.startsWith("vcready_") || k === "dataroom_results");
      allKeys.forEach((k) => {
        if (!keysToKeep.includes(k)) localStorage.removeItem(k);
      });
    }
    router.push("/");
  }

  const isOnboarded = !!firstName;

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

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Identity pill — shown when onboarded */}
          {isOnboarded && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/30 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">
                {firstName![0].toUpperCase()}
              </span>
              {firstName}
            </Link>
          )}

          {/* Sign out — shown when authenticated */}
          {user && isOnboarded && (
            <button
              onClick={handleSignOut}
              className="hidden sm:block text-xs text-muted hover:text-ink transition-colors font-medium"
            >
              Sign out
            </button>
          )}

          {/* Sign in link — shown when not authenticated and onboarded locally */}
          {!user && isOnboarded && !loading && (
            <Link
              href="/auth/login"
              className="hidden sm:block text-xs text-muted hover:text-ink transition-colors font-medium"
            >
              Sign in
            </Link>
          )}

          {/* CTA — shown when not onboarded */}
          {!isOnboarded && !loading && (
            <Button href="/onboard" size="sm">
              Analyze my startup
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
