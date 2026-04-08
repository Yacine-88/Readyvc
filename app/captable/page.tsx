import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cap Table Manager - VCReady",
  description: "Manage your cap table, track ownership, and model dilution scenarios for future rounds.",
};

const shareholderTypes = [
  { value: "founder", label: "Founder" },
  { value: "employee", label: "Employee (ESOP)" },
  { value: "angel", label: "Angel Investor" },
  { value: "vc", label: "VC / Institution" },
  { value: "advisor", label: "Advisor" },
];

export default function CapTablePage() {
  return (
    <ToolPageLayout
      kicker="Cap Table Manager"
      title="Track ownership and model dilution."
      description="Manage your cap table, add shareholders, and simulate how future rounds will impact ownership."
    >
      {/* Current Shareholders */}
      <ToolSection title="Current Shareholders">
        <div className="space-y-3 mb-4">
          <ShareholderRow name="Alice Chen" type="Founder" shares="4,000,000" percent="40%" />
          <ShareholderRow name="Bob Smith" type="Founder" shares="3,000,000" percent="30%" />
          <ShareholderRow name="ESOP Pool" type="Employee" shares="1,500,000" percent="15%" />
          <ShareholderRow name="Angel Syndicate" type="Angel" shares="1,500,000" percent="15%" />
        </div>
        
        <div className="border-t border-border pt-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-muted">Total Shares Outstanding</p>
            <p className="text-xl font-bold font-mono">10,000,000</p>
          </div>
          <Button variant="secondary" size="sm">Add Shareholder</Button>
        </div>
      </ToolSection>

      {/* Add New Shareholder */}
      <ToolSection title="Add Shareholder">
        <FormGrid>
          <InputField
            label="Name"
            id="shareholder_name"
            placeholder="Jane Doe"
          />
          <SelectField
            label="Type"
            id="shareholder_type"
            options={shareholderTypes}
            placeholder="Select type..."
          />
        </FormGrid>
        <FormGrid className="mt-4">
          <InputField
            label="Number of Shares"
            id="shares"
            type="number"
            placeholder="500,000"
          />
          <InputField
            label="Price per Share ($)"
            id="price_per_share"
            type="number"
            placeholder="0.50"
            hint="Leave blank for founders"
          />
        </FormGrid>
        <div className="mt-4">
          <Button>Add to Cap Table</Button>
        </div>
      </ToolSection>

      {/* Dilution Simulator */}
      <ToolSection title="Dilution Simulator">
        <p className="text-sm text-muted mb-4">
          Model how a future funding round will affect current ownership percentages.
        </p>
        <FormGrid>
          <InputField
            label="Round Size ($)"
            id="round_size"
            type="number"
            placeholder="2,000,000"
            hint="Investment amount"
          />
          <InputField
            label="Pre-Money Valuation ($)"
            id="pre_money"
            type="number"
            placeholder="8,000,000"
          />
        </FormGrid>
        <FormGrid className="mt-4">
          <InputField
            label="New ESOP Pool (%)"
            id="new_esop"
            type="number"
            placeholder="10"
            hint="Additional option pool"
          />
          <div className="flex flex-col justify-end">
            <Button>Simulate Round</Button>
          </div>
        </FormGrid>
      </ToolSection>

      {/* Post-Round Preview */}
      <ToolSection title="Post-Round Preview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <ResultCard label="Post-Money Valuation" value="$10M" featured />
          <ResultCard label="New Investor Ownership" value="20%" />
          <ResultCard label="Founder Dilution" value="-8%" status="warning" />
          <ResultCard label="New Share Price" value="$1.00" />
        </div>
        
        <div className="space-y-2 mb-4">
          <PostRoundRow name="Alice Chen" before="40%" after="32%" />
          <PostRoundRow name="Bob Smith" before="30%" after="24%" />
          <PostRoundRow name="ESOP Pool" before="15%" after="12%" />
          <PostRoundRow name="Angel Syndicate" before="15%" after="12%" />
          <PostRoundRow name="New Investor" before="0%" after="20%" isNew />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <p className="text-xs text-muted">
            Simulation only - save to apply changes
          </p>
          <Button>Save scenario</Button>
        </div>
      </ToolSection>
    </ToolPageLayout>
  );
}

function ShareholderRow({
  name,
  type,
  shares,
  percent,
}: {
  name: string;
  type: string;
  shares: string;
  percent: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-soft rounded-[var(--radius-sm)] border border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">
          {name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">{type}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-semibold">{shares}</p>
        <p className="text-xs text-muted">{percent}</p>
      </div>
    </div>
  );
}

function PostRoundRow({
  name,
  before,
  after,
  isNew,
}: {
  name: string;
  before: string;
  after: string;
  isNew?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-[var(--radius-sm)] border ${isNew ? "bg-accent/10 border-accent/30" : "bg-soft border-border"}`}>
      <p className={`text-sm font-semibold ${isNew ? "text-accent" : ""}`}>{name}</p>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted font-mono">{before}</span>
        <span className="text-muted">&rarr;</span>
        <span className={`text-sm font-mono font-semibold ${isNew ? "text-accent" : ""}`}>{after}</span>
      </div>
    </div>
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
