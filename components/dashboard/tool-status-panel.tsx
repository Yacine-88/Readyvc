"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Calculator, BarChart3, FileText, FolderOpen, HelpCircle, PieChart } from "lucide-react";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";
import { getCompletedSteps, type FlowStepId } from "@/lib/flow";

// ─── Config ──────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "metrics" as FlowStepId,
    scoreKey: "metrics_score" as keyof LocalReadinessData,
    label: "Metrics",
    icon: BarChart3,
    href: "/metrics",
    weight: "35%",
  },
  {
    id: "qa" as FlowStepId,
    scoreKey: "qa_score" as keyof LocalReadinessData,
    label: "Q&A",
    icon: HelpCircle,
    href: "/qa",
    weight: "25%",
  },
  {
    id: "valuation" as FlowStepId,
    scoreKey: "valuation_score" as keyof LocalReadinessData,
    label: "Valuation",
    icon: Calculator,
    href: "/valuation",
    weight: "20%",
  },
  {
    id: "captable" as FlowStepId,
    scoreKey: "cap_table_score" as keyof LocalReadinessData,
    label: "Cap Table",
    icon: PieChart,
    href: "/captable",
    weight: "10%",
  },
  {
    id: "pitch" as FlowStepId,
    scoreKey: "pitch_score" as keyof LocalReadinessData,
    label: "Pitch",
    icon: FileText,
    href: "/pitch",
    weight: "5%",
  },
  {
    id: "dataroom" as FlowStepId,
    scoreKey: "dataroom_score" as keyof LocalReadinessData,
    label: "Data Room",
    icon: FolderOpen,
    href: "/dataroom",
    weight: "5%",
  },
] as const;

type ToolStatus = "not_started" | "in_progress" | "completed";

function getStatus(score: number, completed: boolean): ToolStatus {
  if (completed && score > 0) return "completed";
  if (score > 0) return "in_progress";
  return "not_started";
}

const STATUS_CONFIG: Record<ToolStatus, { dot: string; label: string; ctaLabel: string }> = {
  not_started: { dot: "bg-border",   label: "Not started", ctaLabel: "Start →"    },
  in_progress:  { dot: "bg-warning", label: "In progress", ctaLabel: "Continue →" },
  completed:    { dot: "bg-success", label: "Completed",   ctaLabel: "Review →"   },
};

// ─── "Continue where you left off" logic ─────────────────────────────────────

function getNextTool(
  data: LocalReadinessData,
  completedSteps: FlowStepId[]
): (typeof TOOLS)[number] | null {
  // First: find in-progress (has score but not in completedSteps)
  for (const tool of TOOLS) {
    const score = data[tool.scoreKey] as number;
    if (score > 0 && !completedSteps.includes(tool.id)) return tool;
  }
  // Second: find not-started
  for (const tool of TOOLS) {
    const score = data[tool.scoreKey] as number;
    if (score === 0 && !completedSteps.includes(tool.id)) return tool;
  }
  return null; // all completed
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToolStatusPanel() {
  const [data, setData] = useState<LocalReadinessData | null>(null);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  useEffect(() => {
    setData(getLocalReadinessScore());
    setCompletedSteps(getCompletedSteps());
  }, []);

  if (!data) return <div className="animate-pulse h-48 bg-soft rounded-lg" />;

  const nextTool = getNextTool(data, completedSteps);
  const completedCount = TOOLS.filter(
    (t) => getStatus(data[t.scoreKey] as number, completedSteps.includes(t.id)) === "completed"
  ).length;
  const allDone = completedCount === TOOLS.length;

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Progress">
          {allDone
            ? "All tools completed"
            : nextTool
            ? `Continue: ${nextTool.label}`
            : "Tool progress"}
        </CardTitle>
        <span className="text-xs text-muted font-medium">
          {completedCount}/{TOOLS.length} completed
        </span>
      </CardHeader>
      <CardContent>
        {/* "Continue where you left off" banner */}
        {nextTool && !allDone && (
          <Link
            href={nextTool.href}
            className="flex items-center justify-between gap-4 bg-accent/5 border border-accent/25 rounded-[var(--radius-md)] px-4 py-3 mb-4 hover:bg-accent/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <nextTool.icon className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-ink">Continue where you left off</p>
                <p className="text-xs text-muted">{nextTool.label} · {nextTool.weight} of your score</p>
              </div>
            </div>
            <span className="text-sm font-bold text-accent shrink-0 group-hover:translate-x-0.5 transition-transform">
              Open →
            </span>
          </Link>
        )}

        {allDone && (
          <div className="flex items-center gap-3 bg-success/5 border border-success/25 rounded-[var(--radius-md)] px-4 py-3 mb-4">
            <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            <p className="text-sm font-semibold text-success">
              All tools completed. Your score reflects all assessments.
            </p>
          </div>
        )}

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TOOLS.map((tool) => {
            const score = data[tool.scoreKey] as number;
            const status = getStatus(score, completedSteps.includes(tool.id));
            const cfg = STATUS_CONFIG[status];
            const Icon = tool.icon;

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex flex-col bg-soft border border-border rounded-[var(--radius-md)] p-3 hover:border-ink/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-muted" aria-hidden="true" />
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                </div>
                <p className="text-xs font-bold tracking-tight mb-0.5">{tool.label}</p>
                <p className="text-[10px] text-muted mb-2">{tool.weight} weight</p>
                {score > 0 ? (
                  <>
                    <ProgressBar
                      value={score}
                      status={score >= 70 ? "good" : score >= 40 ? "warning" : "danger"}
                      size="sm"
                    />
                    <span className="text-[10px] font-mono font-bold mt-1 text-ink">{score}%</span>
                  </>
                ) : (
                  <span className="text-[10px] text-accent font-semibold mt-auto group-hover:underline">
                    {cfg.ctaLabel}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
