"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getFounderProfile } from "@/lib/onboard";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/dashboard",    labelKey: "nav.dashboard"    as const },
  { href: "/tools",        labelKey: "nav.tools"        as const },
  { href: "/investor-matching/profile", labelKey: "nav.investors" as const },
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
  const [menuOpen,     setMenuOpen]     = useState(false);
  const menuRef                          = useRef<HTMLDivElement | null>(null);

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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Click-outside + Escape to close
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
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
  const isAuthenticated   = isLocalOnly ? !!firstName : !!user;
  const showConnected     = isAuthenticated && !!firstName;
  const showAuthNoProfile = isAuthenticated && !firstName;
  const avatarLetter      = firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";
  const accountLabel      = startupName ?? firstName ?? user?.email ?? "";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">

        {/* Left: Branding */}
        <Link href="/" className="shrink-0 text-sm font-bold tracking-tight">
          VCReady
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href) ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right: Auth + Menu */}
        <div className="flex items-center gap-2 sm:gap-3" ref={menuRef}>
          {loading && !isLocalOnly ? (
            <div className="w-20 h-7 bg-soft rounded-full animate-pulse" />
          ) : isAuthenticated ? (
            // ── AUTHENTICATED: unified avatar-dropdown ─────────────────────
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Open menu"
                className="flex items-center gap-1.5 sm:gap-2 h-9 pl-1 pr-2 sm:pr-3 rounded-full border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/30 active:bg-soft/80 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {avatarLetter}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {showConnected ? (startupName ?? firstName) : (user?.email ?? "Account")}
                </span>
                {/* Caret: visible on ALL widths so the pill reads as a menu trigger */}
                <svg
                  className={`w-3 h-3 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12" fill="none" aria-hidden="true"
                >
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuOpen && (
                <DropdownPanel>
                  {/* Identity header */}
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <div className="text-xs text-muted">Signed in as</div>
                    <div className="text-sm font-semibold text-ink truncate">
                      {accountLabel || "Account"}
                    </div>
                  </div>

                  {/* Mobile-only: primary nav */}
                  <div className="md:hidden py-2 border-b border-border">
                    {NAV_LINKS.map((link) => (
                      <MenuLink
                        key={link.href}
                        href={link.href}
                        active={isActive(link.href)}
                        label={t(link.labelKey)}
                      />
                    ))}
                  </div>

                  {/* Account actions */}
                  <div className="py-2">
                    {showAuthNoProfile ? (
                      <MenuLink
                        href="/onboard"
                        label="Complete profile"
                        icon={<LayoutDashboard className="w-4 h-4" />}
                      />
                    ) : (
                      <MenuLink
                        href="/dashboard"
                        label={t("nav.dashboard")}
                        icon={<LayoutDashboard className="w-4 h-4" />}
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-muted" />
                      Sign out
                    </button>
                  </div>
                </DropdownPanel>
              )}
            </div>
          ) : (
            // ── UNAUTHENTICATED ────────────────────────────────────────────
            <>
              {/* Mobile menu trigger (hamburger) */}
              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-border bg-soft text-ink hover:border-ink/30 transition-colors"
                >
                  {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>

                {menuOpen && (
                  <DropdownPanel>
                    <div className="py-2 border-b border-border">
                      {NAV_LINKS.map((link) => (
                        <MenuLink
                          key={link.href}
                          href={link.href}
                          active={isActive(link.href)}
                          label={t(link.labelKey)}
                        />
                      ))}
                    </div>
                    <div className="py-3 px-3 flex flex-col gap-2">
                      <Link
                        href="/auth/login"
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-full border border-border bg-background text-sm font-semibold text-ink hover:border-ink/30 transition-colors"
                      >
                        <LogIn className="w-4 h-4" /> Log in
                      </Link>
                      <Link
                        href="/onboard"
                        className="w-full inline-flex items-center justify-center h-10 rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
                      >
                        Sign up →
                      </Link>
                    </div>
                  </DropdownPanel>
                )}
              </div>

              {/* Desktop CTAs */}
              <div className="hidden md:flex items-center gap-2">
                <Button href="/auth/login" variant="secondary" size="sm">
                  Log in
                </Button>
                <Button href="/onboard" variant="primary" size="sm">
                  Sign up →
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Menu subcomponents ─────────────────────────────────────────────────────

function DropdownPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-border bg-background shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] overflow-hidden origin-top-right animate-[fadeIn_120ms_ease-out]"
    >
      {children}
    </div>
  );
}

function MenuLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        active ? "bg-soft text-ink font-semibold" : "text-ink hover:bg-soft"
      }`}
    >
      {icon ? <span className="text-muted">{icon}</span> : null}
      <span className="flex-1 truncate">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />}
    </Link>
  );
}
