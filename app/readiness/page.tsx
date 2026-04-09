"use client";

import { useEffect, useState } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getReadinessScore } from "@/lib/db-readiness";
import type { ReadinessScoreData } from "@/lib/db-readiness";

const CATEGORIES: Array<{
  key: keyof ReadinessScoreData;
  label: string;
  href: string;
  weight: string;
  description: string;
}> = [
  {
    key: "metrics_score",
    label: "Metrics & Traction",
    href: "/metrics",
    weight: "35%",
    description: "MRR, growth rate, LTV:CAC, churn — the most critical signals for investors.",
  },
  {
    key: "qa_score",
    label: "Q&A Preparation",
    href: "/qa",
    weight: "25%",
    description: "How well you can answer the 20 questions every investor will ask.",
  },
  {
    key: "valuation_score",
    label: "Valuation",
    href: "/valuation",
    weight: "20%",
    description: "Credible valuation model grounded in benchmarks and investor mechanics.",
  },
  {
    key: "cap_table_score",
    label: "Cap Table",
    href: "/captable",
    weight: "10%",
    description: "Clean ownership structure with founders, investors, and option pool.",
  },
  {
    key: "pitch_score",
    label: "Pitch",
    href: "/pitch",
    weight: "5%",
    description: "Quality and completeness of your pitch narrative.",
  },
  {
    key: "dataroom_score",
    label: "Data Room",
    href: "/dataroom",
    weight: "5%",
    description: "Supporting documentation diversity and completeness.",
  },
];

function getVerdict(score: number): { text: string; className: string; detail: string } {
  if (score >= 80)
    return {
      text: "Excellent",
      className: "text-success",
      detail:
        "You are well-prepared for investor meetings. Focus on refining the details and stress-testing your story.",
    };
  if (score >= 60)
    return {
      text: "Good Progress",
      className: "text-success",
      detail:
        "You have a solid foundation. Complete the remaining tools to reach investor-ready status.",
    };
  if (score >= 40)
    return {
      text: "Needs Work",
      className: "text-warning",
      detail:
        "Good start. Focus on Metrics & Traction and Q&A Preparation — they carry the most weight.",
    };
  return {
    text: "Getting Started",
    className: "text-danger",
    detail:
      "Start by completing the Metrics tool to establish your foundation, then move to Valuation and Q&A.",
  };
}

function getStatus(score: number): "good" | "warning" | "danger" {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "danger";
}

export default function ReadinessPage() {
  const [score, setScore] = useState<ReadinessScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReadinessScore()
      .then(setScore)
      .catch(() => setScore(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ToolPageLayout
        kicker="Investor Readiness"
        title="Your readiness score."
        description="A weighted breakdown of how prepared you are across all six dimensions investors evaluate."
      >
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-soft rounded-lg" />
          <div className="h-64 bg-soft rounded-lg" />
        </div>
      </ToolPageLayout>
    );
  }

  const overall = score?.overall_score ?? 0;
  const verdict = getVerdict(overall);

  return (
    <ToolPageLayout
      kicker="Investor Readiness"
      title="Your readiness score."
      description="A weighted breakdown of how prepared you are across all six dimensions investors evaluate."
    >
      {/* Overall Score */}
      <ToolSection>
        <div className="grid md:grid-cols-[160px_1fr] gap-8 items-center">
          {/* Gauge */}
          <div className="relative w-[160px] h-[160px] mx-auto md:mx-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--color-border)" strokeWidth="10" />
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(overall / 100) * 427} 427`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold tracking-tight font-mono">{overall}</span>
              <span className="text-xs font-semibold text-muted">/100</span>
            </div>
          </div>

          {/* Verdict */}
          <div>
            <h2 className={`text-3xl font-bold tracking-tight mb-2 ${verdict.className}`}>
              {verdict.text}
            </h2>
            <p className="text-sm text-ink-secondary leading-relaxed mb-5">{verdict.detail}</p>
            <div className="flex gap-3 flex-wrap">
              <Button href="/dashboard" variant="secondary" size="sm">
                ← Back to Dashboard
              </Button>
              <Button href="/tools" size="sm">
                Complete Tools →
              </Button>
            </div>
          </div>
        </div>
      </ToolSection>

      {/* Category Breakdown */}
      <ToolSection title="Score Breakdown">
        <p className="text-xs text-muted mb-5">
          Weights reflect relative importance to investors. Metrics & Traction and Q&A carry 60% combined.
        </p>
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const catScore = (score?.[cat.key] as number) ?? 0;
            const status = getStatus(catScore);
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{cat.label}</span>
                    <span className="text-[10px] font-bold text-muted bg-soft border border-border px-1.5 py-0.5 rounded">
                      {cat.weight}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono">{catScore}/100</span>
                    <Link
                      href={cat.href}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      {catScore === 0 ? "Start →" : "Improve →"}
                    </Link>
                  </div>
                </div>
                <ProgressBar value={catScore} status={status} size="sm" />
                <p className="text-[11px] text-muted mt-1">{cat.description}</p>
              </div>
            );
          })}
        </div>
      </ToolSection>

      {/* Methodology */}
      <ToolSection title="How This Score Is Calculated">
        <div className="text-sm text-ink-secondary space-y-3 leading-relaxed">
          <p>
            Your investor readiness score is a{" "}
            <strong>weighted average of six sub-scores</strong>, each derived from data you enter
            across the VCReady tools. The weights reflect what institutional investors evaluate most
            heavily at early stage.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-muted">Dimension</th>
                  <th className="text-right py-2 font-semibold text-muted">Weight</th>
                  <th className="text-left py-2 pl-4 font-semibold text-muted">Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => (
                  <tr key={cat.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 font-medium">{cat.label}</td>
                    <td className="text-right py-2 font-mono font-bold">{cat.weight}</td>
                    <td className="py-2 pl-4 text-muted">{cat.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            Scores are not a substitute for real investor feedback. They are benchmarking tools to
            help you prioritise preparation effort.
          </p>
        </div>
      </ToolSection>
    </ToolPageLayout>
  );
}
