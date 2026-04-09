"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getMetrics } from "@/lib/db-metrics";
import { getValuation } from "@/lib/db-valuation";

export function ExecutiveSummary() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [metricsData, valuationData] = await Promise.all([
          getMetrics(),
          getValuation(),
        ]);

        const latest = {
          metrics: metricsData?.[0],
          valuation: valuationData?.[0],
        };

        setData(latest);
      } catch (error) {
        console.error("[v0] Error loading executive summary:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-24 bg-soft rounded-lg" />;
  }
  
  const metrics: Array<{ label: string; value: string; change: string; status: "good" | "neutral" | "warning" | "danger" }> = [
    { label: "MRR", value: data?.metrics?.monthly_revenue ? `$${(data.metrics.monthly_revenue / 12).toLocaleString('en-US', {maximumFractionDigits: 0})}` : "-", change: `Growth: ${data?.metrics?.monthly_growth_rate?.toFixed(1) || 0}%`, status: (data?.metrics?.monthly_growth_rate || 0) > 20 ? "good" : "neutral" },
    { label: "Growth Rate", value: `${data?.metrics?.monthly_growth_rate?.toFixed(1) || 0}%`, change: "MoM", status: (data?.metrics?.monthly_growth_rate || 0) > 20 ? "good" : "neutral" },
    { label: "LTV:CAC", value: data?.metrics ? `${((data.metrics.lifetime_value || 0) / (data.metrics.customer_acquisition_cost || 1)).toFixed(1)}x` : "-", change: "Healthy", status: ((data?.metrics?.lifetime_value || 0) / (data?.metrics?.customer_acquisition_cost || 1)) > 3 ? "good" : "warning" },
    { label: "Valuation", value: data?.valuation?.estimated_valuation ? `$${(data.valuation.estimated_valuation / 1000000).toFixed(1)}M` : "-", change: `Stage: ${data?.valuation?.stage || "-"}`, status: "neutral" },
  ];

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
