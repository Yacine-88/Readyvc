"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

export function FinalCTA() {
  const { t } = useI18n();
  
  return (
    <section className="bg-ink text-white">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          {/* Content */}
          <div className="max-w-2xl">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
              {t("cta.eyebrow")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-tight mb-4 text-balance">
              {t("cta.title")}
            </h2>
            <p className="text-white/65 text-base leading-relaxed max-w-lg text-pretty">
              {t("cta.subtitle")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button
                href="/dashboard"
                size="lg"
                className="bg-accent text-white hover:bg-accent/90 border-accent"
              >
                {t("cta.primary")}
                <span aria-hidden="true">&rarr;</span>
              </Button>
              <Button
                href="/valuation"
                variant="secondary"
                className="bg-transparent text-white border-white/30 hover:border-white hover:bg-white/5"
                size="lg"
              >
                {t("cta.secondary")}
              </Button>
            </div>
            <a 
              href={CALENDLY_URL}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 text-sm hover:text-white transition-colors underline underline-offset-4"
            >
              {t("cta.bookSession")} &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
