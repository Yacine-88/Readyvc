"use client";

import { useI18n } from "@/lib/i18n";
import { Container } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const LINKEDIN_URL = "https://www.linkedin.com/in/yacine-chikhar-a53906103/";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="py-12 md:py-20">
      <Container>
        <div className="max-w-2xl mx-auto">

          {/* Kicker + Title */}
          <div className="mb-10 md:mb-14">
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              About VCReady
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium tracking-tight leading-tight text-balance mb-0">
              {t("about.title")}
            </h1>
          </div>

          {/* Body text */}
          <div className="space-y-5 mb-12 md:mb-16">
            <p className="text-base md:text-lg text-ink-secondary leading-relaxed">
              {t("about.para1")}
            </p>
            <p className="text-base md:text-lg text-ink-secondary leading-relaxed">
              {t("about.para2")}
            </p>
            <p className="text-base md:text-lg text-ink-secondary leading-relaxed">
              {t("about.para3")}
            </p>
          </div>

          {/* Founder card */}
          <div className="bg-soft border border-border rounded-[var(--radius-lg)] p-6 md:p-10 mb-10 md:mb-14">
            <p className="eyebrow mb-6">{t("about.founder.title")}</p>

            {/* Identity row */}
            <div className="flex items-center gap-4 mb-5">
              {/* Avatar initials */}
              <div className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center text-sm font-bold tracking-tight shrink-0">
                YC
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight leading-tight">
                  {t("about.founder.name")}
                </h2>
                <p className="text-sm text-muted">Founder, VCReady</p>
              </div>
              {/* LinkedIn */}
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Yacine CHIKHAR on LinkedIn"
                className="ml-auto shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-8 h-8"
                  aria-hidden="true"
                >
                  <rect width="24" height="24" rx="4" fill="#0A66C2" />
                  <path
                    fill="#fff"
                    d="M7.75 9.5h-2.5v8h2.5v-8zM6.5 8.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM18.75 17.5h-2.5v-3.9c0-2.3-2.75-2.13-2.75 0v3.9h-2.5v-8h2.5v1.17C14.58 9.02 18.75 8.8 18.75 13v4.5z"
                  />
                </svg>
              </a>
            </div>

            {/* Bio */}
            <div className="space-y-3">
              {t("about.founder.bio").split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-sm md:text-base text-ink-secondary leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-ink-secondary text-sm mb-5">Ready to get started?</p>
            <Link href="/dashboard">
              <Button size="lg">
                Go to Dashboard →
              </Button>
            </Link>
          </div>

        </div>
      </Container>
    </div>
  );
}
