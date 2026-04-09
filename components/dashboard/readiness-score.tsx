"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";

const CATEGORIES = [
  { key: "metrics_score",   label: "Metrics & Traction", href: "/metrics",   weight: "35%" },
  { key: "qa_score",        label: "Q&A Prep",           href: "/qa",        weight: "25%" },
  { key: "valuation_score", label: "Valuation",          href: "/valuation", weight: "20%" },
  { key: "cap_table_score", label: "Cap Table",          href: "/captable",  weight: "10%" },
  { key: "pitch_score",     label: "Pitch",              href: "/pitch",     weight: "5%"  },
  { key: "dataroom_score",  label: "Data Room",          href: "/dataroom",  weight: "5%"  },
] as const satisfies ReadonlyArray<{
  key: keyof LocalReadinessData;
  label: string;
  href: string;
  weight: string;
}>;

function getStatus(score: number): "good" | "warning" | "danger" {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "danger";
}

function getVerdict(score: number) {
  if (score >= 80) return { text: "Investor Ready",  className: "text-success" };
  if (score >= 60) return { text: "Almost Ready",    className: "text-success" };
  if (score >= 35) return { text: "Needs Work",      className: "text-warning" };
  return             { text: "Getting Started",      className: "text-danger"  };
}

function getInterpretation(score: number): string {
  if (score >= 80) return "You're well-prepared for investor meetings. Refine the details and book your first call.";
  if (score >= 60) return "You have a solid foundation. Complete the remaining tools to push above 80.";
  if (score >= 35) return "Good start. Focus on Metrics and Q&A first — they carry 60% of the score.";
  return "Begin by saving your Metrics and completing Q&A — they unlock 60% of your readiness score.";
}

export function ReadinessScore() {
  const { t } = useI18n();
  const [data, setData] = useState<LocalReadinessData | null>(null);

  useEffect(() => {
    setData(getLocalReadinessScore());
  }, []);

  const overall = data?.overall_score ?? 0;
  const verdict = getVerdict(overall);

  if (!data) {
    return <div className="animate-pulse h-96 bg-soft rounded-lg" />;
  }

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Investor Readiness">{t("dashboard.score.title")}</CardTitle>
        <Link href="/readiness" className="text-xs font-semibold text-ink hover:text-accent transition-colors">
          {t("common.viewAll")} &rarr;
        </Link>
      </CardHeader>
      <CardContent>
        {/* Score gauge + verdict */}
        <div className="grid md:grid-cols-[140px_1fr] gap-6 items-center mb-6">
          <div className="relative w-[140px] h-[140px] mx-auto md:mx-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-border)" strokeWidth="9" />
              <circle
                cx="70" cy="70" r="60" fill="none"
                stroke="var(--color-accent)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(overall / 100) * 377} 377`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold tracking-tight font-mono">{overall}</span>
              <span className="text-xs font-semibold text-muted tracking-wide">/100</span>
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-bold tracking-tight mb-2 ${verdict.className}`}>
              {verdict.text}
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              {getInterpretation(overall)}
            </p>
          </div>
        </div>

        {/* 6-category breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const score = data[cat.key] as number;
            const status = getStatus(score);
            return (
              <div key={cat.key} className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="eyebrow text-[10px] leading-tight">{cat.label}</span>
                  <span className="text-[10px] text-muted font-semibold shrink-0">{cat.weight}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold font-mono">{score}%</span>
                </div>
                <ProgressBar value={score} status={status} size="sm" />
                <Link href={cat.href} className="text-[11px] font-semibold text-accent mt-2 block hover:underline">
                  {score === 0 ? "Start →" : score < 70 ? "Improve →" : "View →"}
                </Link>
              </div>
            );
          })}
        </div>

        {/* No data nudge */}
        {overall === 0 && (
          <div className="mt-4 bg-warning/10 border border-warning/30 rounded-[var(--radius-md)] p-3 text-xs text-warning font-medium">
            No saved data yet. Complete each tool and click Save — your score will update here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
