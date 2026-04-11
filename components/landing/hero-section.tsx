"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Section, Container } from "@/components/layout/section";
import { HeroPreviewCard } from "./hero-preview-card";
import { useI18n } from "@/lib/i18n";
import { isOnboarded, getFounderProfile } from "@/lib/onboard";

export function HeroSection() {
  const { t } = useI18n();
  const [onboarded, setOnboarded] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const profile = getFounderProfile();
    if (profile) {
      setOnboarded(true);
      setFirstName(profile.name.split(" ")[0]);
    }
  }, []);

  return (
    <Section bordered={true} padding="lg" className="relative overflow-hidden">
      {/* Subtle radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at top, rgba(0,0,0,0.03), transparent 50%)",
        }}
        aria-hidden="true"
      />

      <Container className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <p className="eyebrow inline-flex items-center gap-2.5 mb-5">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>

            <h1 className="heading-display text-4xl sm:text-5xl md:text-6xl lg:text-[68px] text-balance mb-4 md:mb-5">
              {t("hero.title")}
            </h1>

            <p className="text-ink-secondary text-sm md:text-base lg:text-lg leading-relaxed max-w-xl mb-6 md:mb-8 text-pretty">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-3 mb-5 md:mb-6">
              {onboarded ? (
                <>
                  <Button href="/dashboard" size="lg">
                    {firstName ? `Welcome back, ${firstName}` : "Go to dashboard"}
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                  <Button href="/metrics" variant="secondary" size="lg">
                    Continue analysis
                  </Button>
                </>
              ) : (
                <>
                  <Button href="/onboard" size="lg">
                    {t("hero.cta.primary")}
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                  <Button href="#how-it-works" variant="secondary" size="lg">
                    {t("hero.cta.secondary")}
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-5 text-xs font-medium text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Free tools included
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Investor-grade insights
              </span>
            </div>
          </div>

          {/* Right: Preview Card — hidden on mobile */}
          <div className="hidden lg:block lg:pl-4">
            <HeroPreviewCard />
          </div>
        </div>
      </Container>
    </Section>
  );
}
