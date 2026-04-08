import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Calculator, BarChart3, FileText, FolderOpen, HelpCircle, Target } from "lucide-react";

const tools = [
  {
    href: "/valuation",
    icon: Calculator,
    title: "Valuation",
    description: "VC method calculator",
  },
  {
    href: "/metrics",
    icon: BarChart3,
    title: "Metrics",
    description: "KPI dashboard",
  },
  {
    href: "/pitch",
    icon: FileText,
    title: "Pitch",
    description: "Deck analyzer",
  },
  {
    href: "/dataroom",
    icon: FolderOpen,
    title: "Data Room",
    description: "Document checklist",
  },
  {
    href: "/qa",
    icon: HelpCircle,
    title: "Q&A Prep",
    description: "Investor questions",
  },
  {
    href: "/readiness",
    icon: Target,
    title: "Readiness",
    description: "Full assessment",
  },
];

export function QuickLinks() {
  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Tools">Quick Access</CardTitle>
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
      <span className="text-[11px] text-muted">{description}</span>
    </Link>
  );
}
