"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Calculator, BarChart3, FileText, FolderOpen, HelpCircle, Target, PieChart } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function QuickLinks() {
  const { t } = useI18n();
  
  const tools = [
    {
      href: "/valuation",
      icon: Calculator,
      title: t("nav.valuation"),
      description: t("tool.valuation.desc").slice(0, 40) + "...",
    },
    {
      href: "/metrics",
      icon: BarChart3,
      title: t("nav.metrics"),
      description: t("tool.metrics.desc").slice(0, 40) + "...",
    },
    {
      href: "/pitch",
      icon: FileText,
      title: t("nav.pitch"),
      description: t("tool.pitch.desc").slice(0, 40) + "...",
    },
    {
      href: "/dataroom",
      icon: FolderOpen,
      title: t("nav.dataroom"),
      description: t("tool.dataroom.desc").slice(0, 40) + "...",
    },
    {
      href: "/qa",
      icon: HelpCircle,
      title: t("nav.qa"),
      description: t("tool.qa.desc").slice(0, 40) + "...",
    },
    {
      href: "/captable",
      icon: PieChart,
      title: t("nav.captable"),
      description: t("tool.captable.desc").slice(0, 40) + "...",
    },
    {
      href: "/readiness",
      icon: Target,
      title: t("nav.readiness"),
      description: t("tool.readiness.desc").slice(0, 40) + "...",
    },
  ];

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Tools">{t("dashboard.quicklinks.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {tools.map((tool) => (
            <ToolLink key={tool.href} {...tool} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ToolLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-soft border border-border rounded-[var(--radius-md)] p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm"
    >
      <Icon className="w-5 h-5 text-muted mb-3" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <ArrowRight
          className="w-3.5 h-3.5 text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
      <span className="text-[11px] text-muted line-clamp-2">{description}</span>
    </Link>
  );
}
