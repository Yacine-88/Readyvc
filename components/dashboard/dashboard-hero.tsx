"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function DashboardHero() {
  const { t } = useI18n();
  const [data, setData] = useState<LocalReadinessData | null>(null);

  useEffect(() => {
    setData(getLocalReadinessScore());
  }, []);

  const overall = data?.overall_score ?? null;
  const valuation = data?.estimated_valuation ?? null;
  const runway = data?.runway ?? null;

  return (
    <Card className="overflow-hidden" padding="lg">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left */}
        <div className="flex flex-col justify-between min-h-[280px]">
          <div>
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              {t("dashboard.title")}
            </p>
            <h1 className="heading-display text-4xl md:text-5xl text-balance mb-3">
              {t("dashboard.welcome")}, <span className="text-muted">Founder.</span>
            </h1>
            <p className="text-ink-secondary text-base leading-relaxed max-w-lg text-pretty">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button href="/readiness">
              {t("dashboard.score.title")}
              <span aria-hidden="true">&rarr;</span>
            </Button>
            <Button href="/metrics" variant="secondary">
              {t("nav.valuation")}
            </Button>
          </div>
        </div>

        {/* Right: live summary cards */}
        <div className="grid gap-4">
          <MiniSummaryCard
            label={t("dashboard.score.title")}
            value={overall !== null ? String(overall) : "—"}
            suffix={overall !== null ? "/100" : undefined}
            description={
              overall === null
                ? "Complete a tool to see your score"
                : overall >= 70
                ? "You're investor ready"
                : overall >= 40
                ? "Keep completing the tools"
                : "Start with Metrics & Q&A"
            }
          />
          <MiniSummaryCard
            label={t("nav.valuation")}
            value={valuation ? fmt(valuation) : "—"}
            description={
              valuation
                ? `${data?.stage ?? ""} ${data?.sector ?? ""}`.trim() || "Based on your inputs"
                : "Complete Valuation to see"
            }
          />
          <MiniSummaryCard
            label="Runway"
            value={runway ? `${Math.min(Math.round(runway), 99)} mo` : "—"}
            description={
              runway
                ? runway >= 18
                  ? "Strong runway for fundraising"
                  : runway >= 12
                  ? "Consider extending before raising"
                  : "Prioritize extending runway"
                : "Complete Metrics to see"
            }
          />
        </div>
      </div>
    </Card>
  );
}

function MiniSummaryCard({
  label,
  value,
  suffix,
  description,
}: {
  label: string;
  value: string;
  suffix?: string;
  description: string;
}) {
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight leading-none mb-1 font-mono">
        {value}
        {suffix && <span className="text-muted text-base font-bold">{suffix}</span>}
      </p>
      <p className="text-xs text-ink-secondary">{description}</p>
    </div>
  );
}
