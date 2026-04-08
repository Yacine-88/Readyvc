"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { t } = useI18n();
  
  const toolLinks = [
    { href: "/valuation", label: t("nav.valuation") },
    { href: "/metrics", label: t("nav.metrics") },
    { href: "/pitch", label: t("nav.pitch") },
    { href: "/dataroom", label: t("nav.dataroom") },
    { href: "/qa", label: t("nav.qa") },
    { href: "/captable", label: t("nav.captable") },
    { href: "/readiness", label: t("nav.readiness") },
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
            <form className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder={t("newsletter.placeholder")}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-[var(--radius-sm)] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 w-full md:w-64"
              />
              <Button variant="secondary" size="sm" className="shrink-0 bg-white text-ink hover:bg-white/90">
                {t("newsletter.cta")}
              </Button>
            </form>
          </div>
        </div>
        
        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Tools */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{t("footer.tools")}</p>
            <ul className="space-y-2">
              {toolLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{t("footer.resources")}</p>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
                  {t("nav.dashboard")}
                </Link>
              </li>
              <li>
                <Link href="/readiness" className="text-sm text-white/60 hover:text-white transition-colors">
                  {t("nav.readiness")}
                </Link>
              </li>
              <li>
                <a href="https://cal.com" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">
                  {t("cta.bookSession")}
                </a>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{t("footer.legal")}</p>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Book a Session CTA */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{t("cta.bookSession")}</p>
            <p className="text-sm text-white/60 mb-4">{t("cta.bookSession.desc")}</p>
            <Button 
              href="https://cal.com" 
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
              className="h-5 w-auto opacity-80"
            />
            <p className="text-xs text-white/50">
              {t("footer.by")} <span className="text-white/80 font-medium">Yacine CHIKHAR</span>{" "}
              &middot; &copy; {new Date().getFullYear()}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-white text-xs font-semibold hover:text-white/80 transition-colors"
          >
            {t("nav.dashboard")} &rarr;
          </Link>
        </div>
      </div>
    </footer>
  );
}
