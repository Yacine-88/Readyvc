"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [toolsOpen, setToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toolLinks = [
    { href: "/valuation", label: t("nav.valuation") },
    { href: "/metrics", label: t("nav.metrics") },
    { href: "/pitch", label: t("nav.pitch") },
    { href: "/dataroom", label: t("nav.dataroom") },
    { href: "/qa", label: t("nav.qa") },
    { href: "/captable", label: t("nav.captable") },
  ];

  const isToolActive = toolLinks.some((link) => pathname === link.href);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background">
      <div className="max-w-[var(--container-max)] mx-auto px-6 h-full flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="shrink-0 flex items-center">
          <Image
            src="/logo-black.png"
            alt="VCReady"
            width={120}
            height={24}
            style={{ width: "auto", height: "auto" }}
            className="h-5"
            priority
          />
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors ${
              pathname === "/dashboard" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Dashboard
          </Link>

          {/* Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                isToolActive ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              Tools
              <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>

            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 py-2 bg-background border border-border rounded-lg shadow-lg">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setToolsOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === link.href
                        ? "text-foreground bg-muted/50"
                        : "text-muted hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/readiness"
            className={`text-sm font-medium transition-colors ${
              pathname === "/readiness" ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Readiness
          </Link>
        </nav>

        {/* Right: Book a session CTA */}
        <div className="flex items-center gap-3">
          <Button
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            {t("cta.bookSession")}
          </Button>
        </div>
      </div>
    </header>
  );
}
