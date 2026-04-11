import Link from "next/link";
import { Section, Container, SectionHeader } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calculator, BarChart3, FileText, FolderOpen, HelpCircle, PieChart, LineChart, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tools: {
  number: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  featured?: boolean;
  icon: LucideIcon;
}[] = [
  {
    number: "01",
    icon: Calculator,
    title: "Valuation Calculator",
    description:
      "Estimate your startup value using the VC method. IRR, EV, CoCa, and Investor Score across 3 scenarios.",
    href: "/valuation",
    tags: ["VC Method", "IRR", "26 Sectors"],
    featured: true,
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Metrics Dashboard",
    description:
      "Sector-specific KPIs investors will ask about. Calculate your unit economics, runway, and growth health.",
    href: "/metrics",
    tags: ["SaaS", "Marketplace", "Fintech"],
  },
  {
    number: "03",
    icon: FileText,
    title: "Pitch Analyzer",
    description:
      "Structure and validate your pitch against what investors actually look for. Section-by-section feedback.",
    href: "/pitch",
    tags: ["Structure", "Feedback"],
  },
  {
    number: "04",
    icon: FolderOpen,
    title: "Data Room Builder",
    description:
      "Know exactly what documents you need. Track completeness and get organized before due diligence.",
    href: "/dataroom",
    tags: ["Documents", "Checklist"],
  },
  {
    number: "05",
    icon: HelpCircle,
    title: "Q&A Preparation",
    description:
      "The 50+ questions investors will ask. Prepare your answers and identify gaps in your story.",
    href: "/qa",
    tags: ["50+ Questions", "Practice"],
  },
  {
    number: "06",
    icon: PieChart,
    title: "Cap Table Manager",
    description:
      "Track ownership, add shareholders, and model dilution scenarios for future funding rounds.",
    href: "/captable",
    tags: ["Ownership", "Dilution"],
  },
  {
    number: "07",
    icon: LineChart,
    title: "Sector Comparables",
    description:
      "Benchmark your startup against market data. Find the right valuation multiple and build your comparable analysis.",
    href: "/comparables",
    tags: ["Benchmarking", "Multiples"],
  },
  {
    number: "08",
    icon: Target,
    title: "Readiness Score",
    description:
      "Your overall investor readiness score. See where you stand and what to improve before raising.",
    href: "/readiness",
    tags: ["Score", "Insights"],
  },
];

export function ToolsSection() {
  return (
    <Section padding="lg">
      <Container>
        <SectionHeader
          kicker="Core Tools"
          title="Everything you need to prepare for fundraising."
          description="Six integrated tools designed to help you understand, measure, and improve your position before meeting investors."
          className="mb-10"
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.number} {...tool} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function ToolCard({
  number,
  icon: Icon,
  title,
  description,
  href,
  tags,
  featured,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  tags: string[];
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-card border border-border rounded-[var(--radius-lg)] p-5 pb-14 min-h-[220px] transition-all duration-150 hover:-translate-y-1 hover:border-ink/20 hover:shadow-md hover:bg-soft"
    >
      {/* Top row: icon + number + badge */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-soft border border-border flex items-center justify-center group-hover:border-ink/20 transition-colors">
            <Icon className="w-4 h-4 text-muted" aria-hidden="true" />
          </div>
          <span className="eyebrow">{number}</span>
        </div>
        {featured && <Badge variant="success">Popular</Badge>}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold tracking-tight mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted leading-relaxed mb-4 flex-1">{description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-soft border border-border text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Arrow */}
      <div className="absolute bottom-5 right-5">
        <ArrowRight
          className="w-5 h-5 text-ink opacity-60 transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      {/* CTA */}
      <span className="absolute bottom-5 left-5 text-xs font-bold text-ink">
        Open tool
      </span>
    </Link>
  );
}
