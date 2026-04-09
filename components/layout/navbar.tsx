"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  // Force hydration consistency - navbar redesigned

  const toolLinks = [
    { href: "/metrics", label: t("nav.metrics") },
    { href: "/valuation", label: t("nav.valuation") },
    { href: "/pitch", label: t("nav.pitch") },
    { href: "/dataroom", label: t("nav.dataroom") },
    { href: "/captable", label: t("nav.captable") },
    { href: "/qa", label: t("nav.qa") },
    { href: "/comparables", label: t("nav.comparables") },
  ];

  const isToolActive = toolLinks.some((link) => pathname === link.href);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background">
      <div className="max-w-[var(--container-max)] mx-auto px-6 h-full flex items-center justify-between">
        {/* Left: Branding */}
        <Link href="/" className="shrink-0 text-sm font-bold tracking-tight">
          VCReady
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors ${
              pathname === "/dashboard" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t("nav.dashboard")}
          </Link>

          {/* Tools Dropdown */}
          <div className="group relative">
            <button
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isToolActive ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {t("nav.tools")}
              <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
            </button>

            <div className="absolute top-full left-0 mt-2 w-48 py-2 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {toolLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    pathname === link.href
                      ? "text-foreground bg-muted/50"
                      : "text-muted hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-2">
                <Link
                  href="/tools"
                  className={`block px-4 py-2 text-sm font-semibold transition-colors ${
                    pathname === "/tools"
                      ? "text-foreground"
                      : "text-muted hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  All tools →
                </Link>
              </div>
            </div>
          </div>

          {/* About */}
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors ${
              pathname === "/about" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t("nav.about")}
          </Link>
        </nav>

        {/* Right: CTA Button */}
        <div className="flex items-center gap-3">
          <Button href="/metrics" size="sm">
            Analyze my startup
          </Button>
        </div>
      </div>
    </header>
  );
}
