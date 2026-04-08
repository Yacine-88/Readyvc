import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Valuation Calculator - VCReady",
  description: "Estimate your startup valuation using the VC method. IRR, EV, CoCa, and Investor Score.",
};

const sectors = [
  { value: "saas", label: "SaaS & Subscription" },
  { value: "marketplace", label: "Marketplace & Commerce" },
  { value: "fintech", label: "Fintech & Payments" },
  { value: "deeptech", label: "Deeptech & Hardware" },
  { value: "biotech", label: "Biotech & MedTech" },
  { value: "consumer", label: "Consumer & D2C" },
];

const stages = [
  { value: "idea", label: "Idea / Pre-product" },
  { value: "mvp", label: "MVP" },
  { value: "seed", label: "Seed" },
  { value: "seriesA", label: "Series A" },
  { value: "seriesB", label: "Series B+" },
];

export default function ValuationPage() {
  return (
    <ToolPageLayout
      kicker="VC Valuation Tool"
      title="Estimate your startup&apos;s value."
      description="Calculate IRR, EV, CoCa and your Investor Score using the VC method. 26 sectors, 3 scenarios, What-If simulator."
    >
      {/* Step 1: General Information */}
      <ToolSection title="General Information">
        <FormGrid>
          <InputField
            label="Startup Name"
            id="startup_name"
            placeholder="TechCo..."
          />
          <SelectField
            label="Currency"
            id="currency"
            options={[
              { value: "USD", label: "USD ($)" },
              { value: "EUR", label: "EUR (EUR)" },
            ]}
          />
        </FormGrid>
        <FormGrid className="mt-4">
          <SelectField
            label="Sector"
            id="sector"
            options={sectors}
            placeholder="Select sector..."
          />
          <SelectField
            label="Stage"
            id="stage"
            options={stages}
            placeholder="Select stage..."
          />
        </FormGrid>
      </ToolSection>

      {/* Step 2: Exit Assumptions */}
      <ToolSection title="Exit Assumptions">
        <FormGrid>
          <InputField
            label="Exit Year"
            id="exit_year"
            type="number"
            placeholder="2030"
            hint="Year the investor exits"
          />
          <InputField
            label="Revenue at Exit ($)"
            id="rev_exit"
            type="number"
            placeholder="5,000,000"
            hint="Projected revenue at exit year"
          />
        </FormGrid>
        <FormGrid className="mt-4">
          <InputField
            label="EV/Revenue Multiple"
            id="ev_mult"
            type="number"
            placeholder="8"
            hint="Comparable sector multiple"
          />
          <InputField
            label="Current Annual Revenue ($)"
            id="rev_current"
            type="number"
            placeholder="500,000"
          />
        </FormGrid>
      </ToolSection>

      {/* Step 3: Investment Details */}
      <ToolSection title="Investment Details">
        <FormGrid>
          <InputField
            label="Investment Amount ($)"
            id="investment"
            type="number"
            placeholder="500,000"
            hint="Amount being raised"
          />
          <InputField
            label="Target IRR (%)"
            id="target_irr"
            type="number"
            placeholder="40"
            hint="Investor's target return"
          />
        </FormGrid>
        <FormGrid className="mt-4">
          <InputField
            label="Post-Money Valuation ($)"
            id="post_money"
            type="number"
            placeholder="4,000,000"
            hint="Valuation after investment"
          />
          <InputField
            label="Dilution (%)"
            id="dilution"
            type="number"
            placeholder="15"
            hint="Expected future dilution"
          />
        </FormGrid>
      </ToolSection>

      {/* Results Preview */}
      <ToolSection title="Results">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <ResultCard label="Pre-Money Valuation" value="$3.5M" featured />
          <ResultCard label="Exit Value (EV)" value="$40M" />
          <ResultCard label="IRR" value="42%" status="good" />
          <ResultCard label="Investor Score" value="78/100" status="good" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <ScenarioCard scenario="Bear" value="$2.8M" irr="28%" />
          <ScenarioCard scenario="Base" value="$3.5M" irr="42%" active />
          <ScenarioCard scenario="Bull" value="$4.5M" irr="58%" />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <p className="text-xs text-muted">
            Results update automatically as you enter data
          </p>
          <Button>Save to dashboard</Button>
        </div>
      </ToolSection>
    </ToolPageLayout>
  );
}

function ResultCard({
  label,
  value,
  featured,
  status,
}: {
  label: string;
  value: string;
  featured?: boolean;
  status?: "good" | "warning" | "danger";
}) {
  const statusColors = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div
      className={`rounded-[var(--radius-md)] p-4 ${
        featured ? "bg-ink text-white" : "bg-soft border border-border"
      }`}
    >
      <p className={`eyebrow mb-2 ${featured ? "text-white/50" : ""}`}>{label}</p>
      <p
        className={`text-2xl font-extrabold tracking-tight leading-none ${
          featured ? "text-white" : status ? statusColors[status] : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ScenarioCard({
  scenario,
  value,
  irr,
  active,
}: {
  scenario: string;
  value: string;
  irr: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] p-4 ${
        active ? "bg-ink text-white" : "bg-soft border border-border"
      }`}
    >
      <p className={`eyebrow text-[10px] mb-2 ${active ? "text-white/50" : ""}`}>
        {scenario} Case
      </p>
      <p className={`text-xl font-extrabold tracking-tight mb-1 ${active ? "text-white" : ""}`}>
        {value}
      </p>
      <p className={`text-xs ${active ? "text-white/60" : "text-muted"}`}>IRR: {irr}</p>
    </div>
  );
}
