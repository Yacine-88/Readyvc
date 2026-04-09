"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";

interface Action {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  category: string;
}

function buildActions(data: LocalReadinessData): Action[] {
  const items: Array<{ key: keyof LocalReadinessData; label: string; href: string; score: number }> = [
    { key: "metrics_score",   label: "Metrics",   href: "/metrics",   score: data.metrics_score   },
    { key: "qa_score",        label: "Q&A",        href: "/qa",        score: data.qa_score        },
    { key: "valuation_score", label: "Valuation",  href: "/valuation", score: data.valuation_score },
    { key: "cap_table_score", label: "Cap Table",  href: "/captable",  score: data.cap_table_score },
    { key: "pitch_score",     label: "Pitch",      href: "/pitch",     score: data.pitch_score     },
    { key: "dataroom_score",  label: "Data Room",  href: "/dataroom",  score: data.dataroom_score  },
  ];

  // Sort by score ascending (biggest gaps first)
  const sorted = [...items].sort((a, b) => a.score - b.score);

  const DETAIL: Record<string, { title: string; description: string }> = {
    metrics_score: {
      title: "Complete your Metrics",
      description: "Enter MRR, CAC, LTV, and churn rate. Metrics carry 35% of your readiness score.",
    },
    qa_score: {
      title: "Prepare Q&A answers",
      description: "Score yourself on 20 investor questions. Q&A carries 25% of your score.",
    },
    valuation_score: {
      title: "Run your Valuation",
      description: "Calculate pre-money using 3 methods. Investors expect a justified number.",
    },
    cap_table_score: {
      title: "Set up your Cap Table",
      description: "Model your current shareholders and simulate your next funding round.",
    },
    pitch_score: {
      title: "Evaluate your Pitch",
      description: "Score your deck across 9 sections: problem, solution, traction, ask, and more.",
    },
    dataroom_score: {
      title: "Build your Data Room",
      description: "Mark which documents you have ready for investor due diligence.",
    },
  };

  const actions: Action[] = [];
  for (const item of sorted) {
    if (item.score >= 70) continue; // already good
    const detail = DETAIL[item.key as string];
    if (!detail) continue;
    actions.push({
      priority: item.score === 0 ? "high" : item.score < 40 ? "medium" : "low",
      title: detail.title,
      description: detail.description,
      href: item.href,
      category: item.label,
    });
    if (actions.length === 3) break;
  }

  // If everything is >=70, show completion message
  if (actions.length === 0) {
    actions.push({
      priority: "low",
      title: "All areas strong",
      description: "Every category scores 70+. Consider booking an investor call to put your preparation to work.",
      href: "/dashboard",
      category: "Overview",
    });
  }

  return actions;
}

export function PriorityActions() {
  const { t } = useI18n();
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    const data = getLocalReadinessScore();
    setActions(buildActions(data));
  }, []);

  if (actions.length === 0) {
    return <div className="animate-pulse h-48 bg-soft rounded-lg" />;
  }

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Action Items">{t("dashboard.actions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((item, i) => (
            <PriorityItem key={i} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityItem({ priority, title, description, href, category }: Action) {
  const variant = { high: "danger" as const, medium: "warning" as const, low: "success" as const };

  return (
    <Link
      href={href}
      className="flex items-start gap-4 bg-card border border-border rounded-[var(--radius-md)] p-4 hover:border-ink/30 transition-colors block"
    >
      <Badge variant={variant[priority]} className="shrink-0 mt-0.5">
        {priority}
      </Badge>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight mb-1">{title}</h4>
        <p className="text-xs text-ink-secondary leading-relaxed">{description}</p>
      </div>
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide shrink-0">
        {category}
      </span>
    </Link>
  );
}
