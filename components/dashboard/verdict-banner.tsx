"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";

// ─── Verdict config ───────────────────────────────────────────────────────────

type VerdictLevel = "not_ready" | "partial" | "ready";

function getVerdict(score: number): VerdictLevel {
  if (score >= 70) return "ready";
  if (score >= 35) return "partial";
  return "not_ready";
}

const VERDICT_CONFIG = {
  ready: {
    icon: "✅",
    label: "Ready to raise",
    labelClass: "text-success",
    barClass: "bg-success",
    description: "Your preparation is investor-grade. Start booking calls.",
  },
  partial: {
    icon: "⚠️",
    label: "Partially ready",
    labelClass: "text-warning",
    barClass: "bg-warning",
    description: "You have a foundation — close the gaps below before approaching investors.",
  },
  not_ready: {
    icon: "❌",
    label: "Not ready to raise",
    labelClass: "text-danger",
    barClass: "bg-danger",
    description: "Start with Metrics and Q&A — they carry 60% of your score.",
  },
} as const;

// ─── Strengths / weaknesses ───────────────────────────────────────────────────

const CATEGORY_META = [
  { key: "metrics_score"   as const, label: "Metrics",   href: "/metrics",   weight: 0.35 },
  { key: "qa_score"        as const, label: "Q&A",       href: "/qa",        weight: 0.25 },
  { key: "valuation_score" as const, label: "Valuation", href: "/valuation", weight: 0.20 },
  { key: "cap_table_score" as const, label: "Cap Table", href: "/captable",  weight: 0.10 },
  { key: "pitch_score"     as const, label: "Pitch",     href: "/pitch",     weight: 0.05 },
  { key: "dataroom_score"  as const, label: "Data Room", href: "/dataroom",  weight: 0.05 },
];

function analyzeData(data: LocalReadinessData) {
  const scored = CATEGORY_META.map((cat) => ({
    ...cat,
    score: data[cat.key] as number,
  }));

  const strengths = scored.filter((c) => c.score >= 70);
  const weaknesses = scored.filter((c) => c.score < 70).sort((a, b) => {
    // Sort by weighted impact (biggest gap × weight first)
    const impactA = (70 - a.score) * a.weight;
    const impactB = (70 - b.score) * b.weight;
    return impactB - impactA;
  });

  return { strengths, weaknesses };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerdictBanner() {
  const [data, setData] = useState<LocalReadinessData | null>(null);

  useEffect(() => {
    setData(getLocalReadinessScore());
  }, []);

  if (!data) {
    return <div className="animate-pulse h-40 bg-soft rounded-lg" />;
  }

  const level = getVerdict(data.overall_score);
  const config = VERDICT_CONFIG[level];
  const { strengths, weaknesses } = analyzeData(data);
  const hasAnyData = data.overall_score > 0;

  return (
    <Card padding="sm">
      <CardContent>
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
          {/* Verdict */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl" aria-hidden="true">{config.icon}</span>
              <h2 className={`text-2xl font-extrabold tracking-tight ${config.labelClass}`}>
                {config.label}
              </h2>
            </div>
            <p className="text-sm text-ink-secondary mb-4 max-w-md">
              {hasAnyData ? config.description : "Complete your first tool to see your verdict."}
            </p>

            {/* Score bar */}
            <div className="flex items-center gap-3 max-w-sm">
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${config.barClass}`}
                  style={{ width: `${data.overall_score}%` }}
                />
              </div>
              <span className="text-sm font-bold font-mono w-14 shrink-0">
                {data.overall_score}/100
              </span>
            </div>
          </div>

          {/* Score ring (compact) */}
          <div className="relative w-[80px] h-[80px] shrink-0 hidden md:block">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(data.overall_score / 100) * 214} 214`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold tracking-tight font-mono">{data.overall_score}</span>
            </div>
          </div>
        </div>

        {/* Strengths + Weaknesses */}
        {hasAnyData && (
          <div className="grid md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
            {/* Strengths */}
            <div>
              <p className="eyebrow mb-3">Strengths</p>
              {strengths.length === 0 ? (
                <p className="text-xs text-muted italic">No category above 70 yet.</p>
              ) : (
                <ul className="space-y-2">
                  {strengths.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-xs text-muted font-mono ml-auto">{s.score}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Weaknesses */}
            <div>
              <p className="eyebrow mb-3">Needs attention</p>
              {weaknesses.length === 0 ? (
                <p className="text-xs text-muted italic">All categories are strong.</p>
              ) : (
                <ul className="space-y-2">
                  {weaknesses.slice(0, 4).map((w) => (
                    <li key={w.key} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.score === 0 ? "bg-danger" : "bg-warning"}`} />
                      <Link href={w.href} className="text-sm font-medium hover:text-accent transition-colors">
                        {w.label}
                      </Link>
                      <span className="text-xs text-muted font-mono ml-auto">
                        {w.score === 0 ? "Not started" : `${w.score}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* No data nudge */}
        {!hasAnyData && (
          <div className="mt-4 bg-warning/10 border border-warning/30 rounded-[var(--radius-md)] p-3 text-xs text-warning font-medium">
            Start with{" "}
            <Link href="/metrics" className="underline font-bold">Metrics</Link>
            {" "}and{" "}
            <Link href="/qa" className="underline font-bold">Q&A</Link>
            {" "}— they carry 60% of your readiness score.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
