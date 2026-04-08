"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/valuation", label: "Valuation" },
  { href: "/metrics", label: "Metrics" },
  { href: "/pitch", label: "Pitch" },
  { href: "/dataroom", label: "Data Room" },
  { href: "/qa", label: "Q&A" },
  { href: "/readiness", label: "Readiness" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-border-strong/80 backdrop-blur-md bg-background/90">
      <div className="max-w-[var(--container-max)] mx-auto px-6 h-full flex items-center justify-between gap-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-10 h-10 border-[1.5px] border-ink rounded-lg flex items-center justify-center text-base font-extrabold tracking-tight bg-card">
            VC
          </span>
          <span className="text-lg font-bold tracking-tight">Ready</span>
        </Link>

        {/* Navigation */}
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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button href="/dashboard" variant="secondary" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href="/dashboard" size="sm">
            Dashboard
            <span aria-hidden="true" className="ml-1">
              &rarr;
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
