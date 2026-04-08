import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DashboardHero() {
  return (
    <Card className="overflow-hidden" padding="lg">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left: Main Content */}
        <div className="flex flex-col justify-between min-h-[280px]">
          <div>
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              Dashboard
            </p>
            <h1 className="heading-display text-4xl md:text-5xl text-balance mb-3">
              Welcome back, <span className="text-muted">Founder.</span>
            </h1>
            <p className="text-ink-secondary text-base leading-relaxed max-w-lg text-pretty">
              Your investor readiness score is improving. Here&apos;s what needs attention before
              your next fundraising milestone.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button href="/readiness">
              View full readiness report
              <span aria-hidden="true">&rarr;</span>
            </Button>
            <Button href="/valuation" variant="secondary">
              Update valuation
            </Button>
          </div>
        </div>

        {/* Right: Summary Cards */}
        <div className="grid gap-4">
          <MiniSummaryCard
            label="Readiness Score"
            value="72"
            suffix="/100"
            description="Up 8 points from last month"
          />
          <MiniSummaryCard
            label="Estimated Valuation"
            value="$4.2M"
            description="Based on current metrics"
          />
          <MiniSummaryCard
            label="Runway"
            value="14 mo"
            description="At current burn rate"
          />
        </div>
      </div>
    </Card>
  );
}

function MiniSummaryCard({
  label,
  value,
  suffix,
  description,
}: {
  label: string;
  value: string;
  suffix?: string;
  description: string;
}) {
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight leading-none mb-1">
        {value}
        {suffix && <span className="text-muted text-base font-bold">{suffix}</span>}
      </p>
      <p className="text-xs text-ink-secondary">{description}</p>
    </div>
  );
}
