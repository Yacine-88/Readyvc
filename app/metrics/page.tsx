import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = {
  title: "Metrics Calculator - VCReady",
  description: "Sector-specific KPIs investors will ask about. Calculate your unit economics, runway, and growth health.",
};

const sectorTabs = [
  { id: "saas", label: "SaaS & Subscription" },
  { id: "marketplace", label: "Marketplace" },
  { id: "fintech", label: "Fintech" },
  { id: "deeptech", label: "Deeptech" },
  { id: "agri", label: "AgriTech" },
];

export default function MetricsPage() {
  return (
    <ToolPageLayout
      kicker="Investor Metrics"
      title="Know your numbers before the room does."
      description="Sector-specific KPIs investors will ask about. Calculate your unit economics, runway, and growth health."
    >
      {/* Sector Tabs */}
      <div className="flex flex-wrap gap-0 border-b border-border mb-8 -mt-2">
        {sectorTabs.map((tab, i) => (
          <button
            key={tab.id}
            className={`px-5 py-3 text-xs font-semibold transition-colors border-b-2 ${
              i === 0
                ? "text-ink border-ink"
                : "text-muted border-transparent hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Input Panel */}
        <div className="space-y-5">
          <ToolSection title="Your Data" className="lg:sticky lg:top-24">
            <div className="space-y-4">
              <InputField
                label="Monthly Recurring Revenue (MRR)"
                id="mrr"
                type="number"
                placeholder="e.g. 15000"
                hint="Total recurring revenue this month ($)"
              />
              <InputField
                label="New Customers / Month"
                id="new_customers"
                type="number"
                placeholder="e.g. 25"
                hint="Paying customers acquired"
              />
              <InputField
                label="Churned Customers / Month"
                id="churned"
                type="number"
                placeholder="e.g. 2"
                hint="Paying customers lost"
              />
              <InputField
                label="Sales & Marketing Spend"
                id="cac_spend"
                type="number"
                placeholder="e.g. 5000"
                hint="All acquisition costs ($)"
              />
              <InputField
                label="Total Active Customers"
                id="total_customers"
                type="number"
                placeholder="e.g. 200"
                hint="Current paying customer base"
              />
              <InputField
                label="Gross Margin (%)"
                id="gross_margin"
                type="number"
                placeholder="e.g. 75"
                hint="Revenue minus COGS as % of revenue"
              />
              <Button className="w-full">Calculate metrics &rarr;</Button>
            </div>
          </ToolSection>
        </div>

        {/* Results Panel */}
        <div className="space-y-5">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="MRR"
              value="$18,400"
              description="Monthly Recurring Revenue"
              status="good"
              benchmark="Industry: $15K-25K at your stage"
            />
            <MetricCard
              label="ARR"
              value="$220,800"
              description="Annual Recurring Revenue"
              status="good"
              benchmark="Growth: +24% YoY"
            />
            <MetricCard
              label="CAC"
              value="$320"
              description="Customer Acquisition Cost"
              status="good"
              benchmark="Target: < $500 for SaaS"
            />
            <MetricCard
              label="LTV"
              value="$2,400"
              description="Customer Lifetime Value"
              status="good"
              benchmark="LTV:CAC = 7.5x (excellent)"
            />
          </div>

          {/* Runway Card */}
          <ToolSection title="Runway Analysis">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">Estimated runway at current burn</p>
              <p className="text-2xl font-extrabold tracking-tight">14 months</p>
            </div>
            <ProgressBar value={14} max={24} status="good" size="md" />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-muted font-medium">0 mo</span>
              <span className="text-[10px] text-muted font-medium">12 mo</span>
              <span className="text-[10px] text-muted font-medium">24 mo</span>
            </div>
          </ToolSection>

          {/* Analysis */}
          <ToolSection title="Analysis & Insights">
            <div className="space-y-4">
              <AnalysisPoint
                type="good"
                text="Your LTV:CAC ratio of 7.5x is excellent. Investors typically look for 3x+ at your stage."
              />
              <AnalysisPoint
                type="good"
                text="Net revenue retention appears strong with low churn. This signals product-market fit."
              />
              <AnalysisPoint
                type="warn"
                text="Consider extending runway to 18+ months before fundraising for better negotiating position."
              />
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted">Save results to track over time</p>
              <Button>Save to dashboard</Button>
            </div>
          </ToolSection>
        </div>
      </div>
    </ToolPageLayout>
  );
}

function MetricCard({
  label,
  value,
  description,
  status,
  benchmark,
}: {
  label: string;
  value: string;
  description: string;
  status: "good" | "warning" | "danger";
  benchmark: string;
}) {
  const statusColors = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  const dotColors = {
    good: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div className="bg-card border border-border rounded-[var(--radius-md)] p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
        <span className="eyebrow text-[10px]">{label}</span>
      </div>
      <p className={`text-3xl font-extrabold tracking-tight leading-none mb-2 ${statusColors[status]}`}>
        {value}
      </p>
      <p className="text-xs text-ink-secondary mb-1">{description}</p>
      <p className="text-[10px] text-muted font-mono">{benchmark}</p>
    </div>
  );
}

function AnalysisPoint({ type, text }: { type: "good" | "warn"; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
          type === "good"
            ? "bg-success-soft text-success"
            : "bg-warning-soft text-warning"
        }`}
      >
        {type === "good" ? "+" : "!"}
      </span>
      <p className="text-sm text-ink-secondary leading-relaxed">{text}</p>
    </div>
  );
}
