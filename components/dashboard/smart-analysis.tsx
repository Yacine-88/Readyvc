"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";

// ─── Types & config ───────────────────────────────────────────────────────────

interface AreaMeta {
  key: keyof LocalReadinessData;
  label: string;
  href: string;
  weight: number;
}

const AREAS: AreaMeta[] = [
  { key: "metrics_score",   label: "Metrics & Traction", href: "/metrics",   weight: 0.35 },
  { key: "qa_score",        label: "Q&A Preparation",    href: "/qa",        weight: 0.25 },
  { key: "valuation_score", label: "Valuation",          href: "/valuation", weight: 0.20 },
  { key: "cap_table_score", label: "Cap Table",          href: "/captable",  weight: 0.10 },
  { key: "pitch_score",     label: "Pitch Deck",         href: "/pitch",     weight: 0.05 },
  { key: "dataroom_score",  label: "Data Room",          href: "/dataroom",  weight: 0.05 },
];

// ─── Analysis logic ───────────────────────────────────────────────────────────

interface Analysis {
  strongestArea: AreaMeta & { score: number } | null;
  weakestArea: AreaMeta & { score: number } | null;
  priorityAction: { label: string; href: string; description: string } | null;
  overallInsight: string;
  completedCount: number;
}

function analyzeScores(data: LocalReadinessData): Analysis {
  const scored = AREAS.map((a) => ({ ...a, score: data[a.key] as number }));
  const started = scored.filter((a) => a.score > 0);
  const completedCount = scored.filter((a) => a.score >= 70).length;
  const overall = data.overall_score;

  // Strongest area (highest score, among started)
  const strongestArea = started.length
    ? started.reduce((best, a) => (a.score > best.score ? a : best))
    : null;

  // Weakest by impact (biggest weighted gap, among not yet at 70)
  const incomplete = scored.filter((a) => a.score < 70);
  const weakestArea = incomplete.length
    ? incomplete.reduce((worst, a) => {
        const impactA = (70 - a.score) * a.weight;
        const impactB = (70 - worst.score) * worst.weight;
        return impactA > impactB ? a : worst;
      })
    : null;

  // Priority action (first zero-score area with highest weight)
  const notStarted = scored.filter((a) => a.score === 0);
  const priorityNotStarted = notStarted.length
    ? notStarted.reduce((best, a) => (a.weight > best.weight ? a : best))
    : null;

  const priorityAction = priorityNotStarted
    ? {
        label: priorityNotStarted.label,
        href: priorityNotStarted.href,
        description: `${Math.round(priorityNotStarted.weight * 100)}% of your readiness score`,
      }
    : weakestArea
    ? {
        label: weakestArea.label,
        href: weakestArea.href,
        description: `Currently ${weakestArea.score}% — improving this has the highest impact on your score`,
      }
    : null;

  // Overall insight text
  let overallInsight: string;
  if (overall === 0) {
    overallInsight =
      "Complete Metrics and Q&A first — together they account for 60% of your investor readiness score.";
  } else if (overall < 35) {
    overallInsight =
      `You're getting started. Focus on completing ${notStarted.length > 0 ? notStarted.map((a) => a.label).slice(0, 2).join(" and ") : "the remaining tools"} to build your foundation.`;
  } else if (overall < 60) {
    const gap = weakestArea
      ? `Improving your ${weakestArea.label} score from ${weakestArea.score}% would have the biggest impact.`
      : "Keep completing tools to improve your overall score.";
    overallInsight = `Solid foundation — you're at ${overall}/100. ${gap}`;
  } else if (overall < 80) {
    overallInsight = strongestArea
      ? `Strong work — ${strongestArea.label} is your best area at ${strongestArea.score}%. Push the remaining tools above 70 to reach investor-ready status.`
      : `You're close to investor-ready at ${overall}/100. Complete the remaining tools to get there.`;
  } else {
    overallInsight = strongestArea
      ? `Investor-ready at ${overall}/100. Your ${strongestArea.label} score (${strongestArea.score}%) is excellent. Consider booking a readiness review to validate your positioning.`
      : `Outstanding preparation at ${overall}/100. You're ready to start booking investor calls.`;
  }

  return { strongestArea, weakestArea, priorityAction, overallInsight, completedCount };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CALENDLY_URL = "https://calendly.com/vcready/30min";

export function SmartAnalysis() {
  const [data, setData] = useState<LocalReadinessData | null>(null);

  useEffect(() => {
    setData(getLocalReadinessScore());
  }, []);

  if (!data) return <div className="animate-pulse h-48 bg-soft rounded-lg" />;

  if (data.overall_score === 0) {
    return (
      <Card padding="sm">
        <CardHeader>
          <CardTitle kicker="Analysis">Smart analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Complete at least one tool and save it — your personalized analysis will appear here.
          </p>
          <Link
            href="/metrics"
            className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-accent hover:underline"
          >
            Start with Metrics →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const analysis = analyzeScores(data);

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Analysis">Smart analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main insight */}
        <p className="text-sm text-ink leading-relaxed mb-5">{analysis.overallInsight}</p>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {/* Strongest area */}
          {analysis.strongestArea && (
            <div className="bg-success/5 border border-success/20 rounded-[var(--radius-md)] p-3">
              <p className="eyebrow text-success mb-1">Strongest area</p>
              <p className="text-sm font-bold">{analysis.strongestArea.label}</p>
              <p className="text-xs text-muted mt-0.5">
                {analysis.strongestArea.score}% · Well prepared
              </p>
            </div>
          )}

          {/* Weakest area */}
          {analysis.weakestArea && (
            <div className="bg-warning/5 border border-warning/20 rounded-[var(--radius-md)] p-3">
              <p className="eyebrow text-warning mb-1">Biggest opportunity</p>
              <p className="text-sm font-bold">{analysis.weakestArea.label}</p>
              <p className="text-xs text-muted mt-0.5">
                {analysis.weakestArea.score === 0
                  ? "Not started yet"
                  : `${analysis.weakestArea.score}% · Needs improvement`}
              </p>
            </div>
          )}
        </div>

        {/* Priority action */}
        {analysis.priorityAction && (
          <div className="border-t border-border pt-4 mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Priority action
            </p>
            <Link
              href={analysis.priorityAction.href}
              className="flex items-center justify-between gap-3 bg-soft border border-border rounded-[var(--radius-md)] px-4 py-3 hover:border-ink/20 transition-colors group"
            >
              <div>
                <p className="text-sm font-bold">{analysis.priorityAction.label}</p>
                <p className="text-xs text-muted">{analysis.priorityAction.description}</p>
              </div>
              <span className="text-sm font-bold text-accent shrink-0 group-hover:translate-x-0.5 transition-transform">
                Go →
              </span>
            </Link>
          </div>
        )}

        {/* Pre-fundraising checklist insight */}
        {data.overall_score >= 60 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Before fundraising
            </p>
            <ul className="space-y-1.5">
              {AREAS.filter((a) => (data[a.key] as number) < 70).map((a) => (
                <li key={a.key} className="flex items-center gap-2 text-xs text-ink-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  <span>
                    Improve{" "}
                    <Link href={a.href} className="font-semibold text-ink hover:text-accent transition-colors">
                      {a.label}
                    </Link>{" "}
                    above 70
                  </span>
                </li>
              ))}
              {AREAS.filter((a) => (data[a.key] as number) >= 70).map((a) => (
                <li key={a.key} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  <span>{a.label} ready</span>
                </li>
              ))}
            </ul>

            {data.overall_score >= 70 && (
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-accent hover:underline"
              >
                Book a founder readiness review →
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
