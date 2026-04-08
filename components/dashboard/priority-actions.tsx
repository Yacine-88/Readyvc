"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function PriorityActions() {
  const { t } = useI18n();
  
  const priorities = [
    {
      priority: "high" as const,
      title: "Complete Data Room",
      description: "Upload term sheet, cap table, and 3-year financial projections.",
      category: t("nav.dataroom"),
    },
    {
      priority: "medium" as const,
      title: "Update Pitch Deck",
      description: "Add traction slide with latest MRR and growth metrics.",
      category: t("nav.pitch"),
    },
    {
      priority: "low" as const,
      title: "Review Q&A Answers",
      description: "Refresh answers to competitive landscape questions.",
      category: t("nav.qa"),
    },
  ];

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Action Items">{t("dashboard.actions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {priorities.map((item, index) => (
            <PriorityItem key={index} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityItem({
  priority,
  title,
  description,
  category,
}: {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  category: string;
}) {
  const priorityVariant = {
    high: "danger" as const,
    medium: "warning" as const,
    low: "success" as const,
  };

  return (
    <div className="flex items-start gap-4 bg-card border border-border rounded-[var(--radius-md)] p-4">
      <Badge variant={priorityVariant[priority]} className="shrink-0 mt-0.5">
        {priority}
      </Badge>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight mb-1">{title}</h4>
        <p className="text-xs text-ink-secondary leading-relaxed">{description}</p>
      </div>
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide shrink-0">
        {category}
      </span>
    </div>
  );
}
