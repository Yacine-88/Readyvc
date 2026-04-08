"use client";

import { useI18n } from "@/lib/i18n";
import { Section } from "@/components/layout/section";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <Section className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <h1 className="heading-display mb-12">{t("about.title")}</h1>

        {/* Content */}
        <div className="space-y-6 mb-16">
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

        {/* Founder Section */}
        <div className="border-t border-border pt-12">
          <h2 className="heading-subsection mb-6">{t("about.founder.title")}</h2>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("about.founder.name")}</h3>
            <div className="body-text text-base leading-relaxed space-y-4">
              {t("about.founder.bio").split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
