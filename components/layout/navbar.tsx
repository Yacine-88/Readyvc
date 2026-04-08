"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  
  const isLandingPage = pathname === "/";

  const navLinks = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/valuation", label: t("nav.valuation") },
    { href: "/metrics", label: t("nav.metrics") },
    { href: "/pitch", label: t("nav.pitch") },
    { href: "/dataroom", label: t("nav.dataroom") },
    { href: "/qa", label: t("nav.qa") },
    { href: "/readiness", label: t("nav.readiness") },
  ];

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-border-strong/80 backdrop-blur-md bg-background/90">
      <div className="max-w-[var(--container-max)] mx-auto px-6 h-full flex items-center justify-between gap-5">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Logo variant="dark" className="h-7 w-auto" />
        </Link>

        {/* Navigation - only show on non-landing pages */}
        {!isLandingPage && (
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold uppercase tracking-wide transition-colors ${
                    isActive ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          {isLandingPage ? (
            <>
              <Button href="/dashboard" variant="ghost" size="sm">
                {t("nav.signin")}
              </Button>
              <Button href="/dashboard" size="sm">
                {t("nav.getStarted")}
                <span aria-hidden="true" className="ml-1">&rarr;</span>
              </Button>
            </>
          ) : (
            <Button href="/" variant="ghost" size="sm">
              Home
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
