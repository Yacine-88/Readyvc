"use client";

import { useI18n } from "@/lib/i18n";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Linkedin } from "lucide-react";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <>
      <Section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="mb-16">
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              About VCReady
            </p>
            <h1 className="heading-display">{t("about.title")}</h1>
          </div>

          {/* Main Content */}
          <div className="prose prose-invert max-w-none mb-16">
            <div className="space-y-8">
              <p className="body-text text-lg leading-relaxed">
                {t("about.para1")}
              </p>
              <p className="body-text text-lg leading-relaxed">
                {t("about.para2")}
              </p>
              <p className="body-text text-lg leading-relaxed">
                {t("about.para3")}
              </p>
            </div>
          </div>

          {/* Founder Section - Styled Card */}
          <div className="bg-soft border border-border rounded-[var(--radius-lg)] p-8 md:p-12">
            <h2 className="heading-subsection mb-8">{t("about.founder.title")}</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-2xl font-semibold">{t("about.founder.name")}</h3>
                  <a
                    href="https://www.linkedin.com/in/yacine-chikhar-a53906103/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Yacine CHIKHAR on LinkedIn"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="body-text text-base leading-relaxed space-y-4 text-ink-secondary">
                  {t("about.founder.bio").split("\n\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <p className="text-ink-secondary mb-6">Ready to get started?</p>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
