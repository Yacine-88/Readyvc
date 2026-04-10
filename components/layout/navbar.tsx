"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const NAV_LINKS = [
  { href: "/dashboard", labelKey: "nav.dashboard" as const },
  { href: "/tools",     labelKey: "nav.tools"     as const },
  { href: "/comparables", labelKey: "nav.comparables" as const },
  { href: "/about",     labelKey: "nav.about"     as const },
];

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();

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
