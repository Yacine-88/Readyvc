"use client";

import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  MessageSquare,
  FolderOpen,
  HelpCircle,
  Users,
  BarChart3,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

const tools = [
  {
    id: "metrics",
    icon: TrendingUp,
    href: "/metrics",
    badge: "not-started" as const,
  },
  {
    id: "valuation",
    icon: DollarSign,
    href: "/valuation",
    badge: "not-started" as const,
  },
  {
    id: "pitch",
    icon: MessageSquare,
    href: "/pitch",
    badge: "not-started" as const,
  },
  {
    id: "dataroom",
    icon: FolderOpen,
    href: "/dataroom",
    badge: "not-started" as const,
  },
  {
    id: "captable",
    icon: Users,
    href: "/captable",
    badge: "not-started" as const,
  },
  {
    id: "qa",
    icon: HelpCircle,
    href: "/qa",
    badge: "not-started" as const,
  },
  {
    id: "comparables",
    icon: BarChart3,
    href: "/comparables",
    badge: "not-started" as const,
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    badge: "not-started" as const,
  },
] as const;

const badgeConfig = {
  "not-started": { label: "Not started", variant: "default" as const },
  "in-progress": { label: "In progress", variant: "warning" as const },
  "complete":    { label: "Complete",    variant: "success" as const },
};

const toolMeta: Record<string, { title: string; description: string }> = {
  metrics:     { title: "Metrics Tracker",    description: "Track your unit economics, growth, and runway against sector benchmarks." },
  valuation:   { title: "Valuation",          description: "Estimate your valuation using the VC method across 3 scenarios and 26 sectors." },
  pitch:       { title: "Pitch Analyzer",     description: "Score your pitch deck section by section against what investors look for." },
  dataroom:    { title: "Data Room",          description: "Track the 45+ documents required for due diligence. Know your gaps." },
  captable:    { title: "Cap Table",          description: "Model your cap table, simulate rounds, and understand dilution." },
  qa:          { title: "Investor Q&A",       description: "Prepare answers to the 30 hardest investor questions, scored by readiness." },
  comparables: { title: "Comparables",        description: "Browse 30+ Africa/MENA/Europe deals. Find the right multiple for your sector." },
  dashboard:   { title: "Dashboard",          description: "See your overall readiness score and where to focus your energy." },
};

export default function ToolsPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-[var(--container-max)] mx-auto px-6 py-12 md:py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
          <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
          {t("nav.tools")}
        </p>
        <h1 className="heading-display mb-4">Build your investor case.</h1>
        <p className="text-lg text-ink-secondary max-w-xl">
          Eight tools. Start with Metrics, end with Dashboard.
        </p>
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          const meta = toolMeta[tool.id];
          const { label, variant } = badgeConfig[tool.badge];

          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="group flex flex-col bg-card border border-border rounded-[var(--radius-lg)] p-5 hover:border-border-strong transition-all"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-soft rounded-[var(--radius-md)] group-hover:bg-muted transition-colors">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <Badge variant={variant}>{label}</Badge>
              </div>

              {/* Number + title */}
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="text-base font-semibold mb-2">{meta.title}</h3>
              <p className="text-sm text-ink-secondary leading-relaxed flex-1">
                {meta.description}
              </p>

              {/* CTA */}
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-foreground transition-colors">
                Open tool <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="border border-border rounded-[var(--radius-lg)] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">See your overall score</h2>
          <p className="text-sm text-ink-secondary">
            Once you've used a few tools, your Dashboard will show your investor readiness score.
          </p>
        </div>
        <Button href="/dashboard" size="md" className="shrink-0">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
