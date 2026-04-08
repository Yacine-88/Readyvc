"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

export function Footer() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    // Simulate submission (replace with actual API call)
    setSubmitted(true);
    setEmail("");
  };

  const toolLinks = [
    { href: "/valuation", label: t("nav.valuation") },
    { href: "/metrics", label: t("nav.metrics") },
    { href: "/pitch", label: t("nav.pitch") },
    { href: "/dataroom", label: t("nav.dataroom") },
    { href: "/qa", label: t("nav.qa") },
    { href: "/captable", label: t("nav.captable") },
  ];

  return (
    <footer className="bg-ink text-white mt-auto">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-12">
        {/* Newsletter Section */}
        <div className="border-b border-white/10 pb-10 mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">{t("newsletter.title")}</h3>
              <p className="text-white/50 text-sm">{t("newsletter.subtitle")}</p>
            </div>

            {submitted ? (
              <div className="flex items-center gap-2 text-accent">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Thank you for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full md:w-auto">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder={t("newsletter.placeholder")}
                    className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 w-full md:w-64"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 bg-white text-ink hover:bg-white/90"
                  >
                    {t("newsletter.cta")}
                  </Button>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </form>
            )}
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Tools */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              {t("footer.tools")}
            </p>
            <ul className="space-y-2">
              {toolLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              {t("footer.resources")}
            </p>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/readiness"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Readiness
                </Link>
              </li>
              <li>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {t("cta.bookSession")}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              {t("footer.legal")}
            </p>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Book a Session */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              {t("cta.bookSession")}
            </p>
            <p className="text-sm text-white/60 mb-4">{t("cta.bookSession.desc")}</p>
            <Button
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
            >
              {t("cta.bookSession")} &rarr;
            </Button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-white.png"
              alt="VCReady"
              width={100}
              height={20}
              style={{ width: "auto", height: "auto" }}
              className="h-5 opacity-80"
            />
            <p className="text-xs text-white/50">
              by <span className="text-white/80 font-medium">Yacine CHIKHAR</span> &middot; &copy;{" "}
              {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
