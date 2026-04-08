"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getReadinessScore } from "@/lib/db-readiness";

export function ReadinessScore() {
  const { t } = useI18n();
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScore() {
      try {
        const data = await getReadinessScore();
        setScore(data);
      } catch (error) {
        console.error("[v0] Error loading readiness score:", error);
        // Set default scores on error
        setScore({
          overall_score: 0,
          metrics_score: 0,
          valuation_score: 0,
          qa_score: 0,
          dataroom_score: 0,
          pitch_score: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    loadScore();
  }, []);
  
  const categories = [
    { 
      label: "Metrics & Traction", 
      score: score?.metrics_score || 0, 
      status: (score?.metrics_score || 0) >= 70 ? "good" : (score?.metrics_score || 0) >= 50 ? "warning" : "danger", 
      href: "/metrics" 
    },
    { 
      label: "Valuation", 
      score: score?.valuation_score || 0, 
      status: (score?.valuation_score || 0) >= 70 ? "good" : (score?.valuation_score || 0) >= 50 ? "warning" : "danger", 
      href: "/valuation" 
    },
    { 
      label: "Q&A Prep", 
      score: score?.qa_score || 0, 
      status: (score?.qa_score || 0) >= 70 ? "good" : (score?.qa_score || 0) >= 50 ? "warning" : "danger", 
      href: "/qa" 
    },
    { 
      label: "Data Room", 
      score: score?.dataroom_score || 0, 
      status: (score?.dataroom_score || 0) >= 70 ? "good" : (score?.dataroom_score || 0) >= 50 ? "warning" : "danger", 
      href: "/dataroom" 
    },
  ];
  
  const overallScore = score?.overall_score || 0;
  const getVerdict = (score: number) => {
    if (score >= 80) return { text: "Excellent", className: "text-success" };
    if (score >= 60) return { text: "Good Progress", className: "text-success" };
    if (score >= 40) return { text: "Needs Work", className: "text-warning" };
    return { text: "Getting Started", className: "text-danger" };
  };

  const verdict = getVerdict(overallScore);

  if (loading) {
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
        <div className="grid md:grid-cols-[140px_1fr] gap-6 items-center mb-6">
          {/* Gauge */}
          <div className="relative w-[140px] h-[140px] mx-auto md:mx-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="9"
              />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${(overallScore / 100) * 377} 377`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold tracking-tight font-mono">{overallScore}</span>
              <span className="text-xs font-semibold text-muted tracking-wide">/100</span>
            </div>
          </div>

          {/* Verdict */}
          <div>
            <h3 className={`text-2xl font-bold tracking-tight mb-2 ${verdict.className}`}>
              {verdict.text}
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              {overallScore >= 80
                ? "You're well-prepared for investor meetings. Focus on refining the details."
                : overallScore >= 60
                ? "You have a solid foundation. Complete the remaining tools to improve readiness."
                : overallScore >= 40
                ? "Good start. Focus on metrics, valuation, and Q&A preparation next."
                : "Start by completing the Metrics tool to establish your foundation."}
            </p>
          </div>
        </div>

        {/* Category Bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="bg-soft border border-border rounded-[var(--radius-md)] p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="eyebrow text-[10px]">{cat.label}</span>
                <span className="text-xs font-bold font-mono">{cat.score}%</span>
              </div>
              <ProgressBar value={cat.score} status={cat.status} size="sm" />
              <Link
                href={cat.href}
                className="text-[11px] font-semibold text-accent mt-2 block hover:underline"
              >
                Complete &rarr;
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
