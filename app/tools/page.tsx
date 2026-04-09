"use client";

import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  TrendingUp, 
  DollarSign, 
  MessageSquare, 
  FolderOpen, 
  HelpCircle, 
  Users, 
  BarChart3,
  ArrowRight 
} from "lucide-react";

interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  status: "not-started" | "in-progress" | "complete";
  category: "financial" | "market" | "operational";
}

export default function ToolsPage() {
  const { t } = useI18n();

  const tools: Tool[] = [
    {
      id: "metrics",
      title: t("tool.metrics.title"),
      description: t("tool.metrics.desc"),
      href: "/metrics",
      icon: TrendingUp,
      status: "not-started",
      category: "financial",
    },
    {
      id: "valuation",
      title: t("tool.valuation.title"),
      description: t("tool.valuation.desc"),
      href: "/valuation",
      icon: DollarSign,
      status: "not-started",
      category: "financial",
    },
    {
      id: "pitch",
      title: t("tool.pitch.title"),
      description: t("tool.pitch.desc"),
      href: "/pitch",
      icon: MessageSquare,
      status: "not-started",
      category: "market",
    },
    {
      id: "dataroom",
      title: t("tool.dataroom.title"),
      description: t("tool.dataroom.desc"),
      href: "/dataroom",
      icon: FolderOpen,
      status: "not-started",
      category: "operational",
    },
    {
      id: "qa",
      title: t("tool.qa.title"),
      description: t("tool.qa.desc"),
      href: "/qa",
      icon: HelpCircle,
      status: "not-started",
      category: "market",
    },
    {
      id: "captable",
      title: t("tool.captable.title"),
      description: t("tool.captable.desc"),
      href: "/captable",
      icon: Users,
      status: "not-started",
      category: "operational",
    },
    {
      id: "comparables",
      title: t("tool.comparables.title"),
      description: t("tool.comparables.desc"),
      href: "/comparables",
      icon: BarChart3,
      status: "not-started",
      category: "market",
    },
  ];

  const statusConfig = {
    "not-started": { label: "Not Started", variant: "default" as const, color: "text-muted" },
    "in-progress": { label: "In Progress", variant: "warning" as const, color: "text-yellow-500" },
    "complete": { label: "Complete", variant: "success" as const, color: "text-green-500" },
  };

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
            <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
            Investor Readiness Tools
          </p>
          <h1 className="heading-display mb-4">
            Build your investor case
          </h1>
          <p className="text-xl text-ink-secondary max-w-2xl">
            Complete each tool to strengthen your fundraising position. Start with Metrics, then move through the rest systematically.
          </p>
        </div>

        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const status = statusConfig[tool.status];
            
            return (
              <Card key={tool.id} className="group hover:border-border-strong transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-soft rounded-[var(--radius-md)] group-hover:bg-muted transition-colors">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <Badge variant={status.variant} className="shrink-0">
                      {status.label}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {tool.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Link href={tool.href}>
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-muted">
                      Open Tool
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-accent to-accent/80 rounded-[var(--radius-lg)] p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to see your progress?
          </h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Once you've completed a few tools, view your Dashboard to see your overall investor readiness score and insights.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-white text-accent hover:bg-white/95 font-semibold">
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
