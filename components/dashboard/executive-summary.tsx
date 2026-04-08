"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const metrics = [
  { label: "MRR", value: "$18,400", change: "+12%", status: "good" as const },
  { label: "Growth Rate", value: "24%", change: "MoM", status: "good" as const },
  { label: "LTV:CAC", value: "4.2x", change: "Healthy", status: "good" as const },
  { label: "Burn Rate", value: "$32K", change: "/month", status: "neutral" as const },
];

export function ExecutiveSummary() {
  const { t } = useI18n();
  
  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Overview">{t("dashboard.summary.title")}</CardTitle>
        <Link href="/metrics" className="text-xs font-semibold text-ink hover:text-accent transition-colors">
          {t("common.viewAll")} &rarr;
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  change,
  status,
}: {
  label: string;
  value: string;
  change: string;
  status: "good" | "warning" | "danger" | "neutral";
}) {
  const statusColors = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  };

  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight leading-none mb-1 font-mono ${statusColors[status]}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{change}</p>
    </div>
  );
}
