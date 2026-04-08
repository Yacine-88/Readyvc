"use client";

import { useState, useMemo, useCallback } from "react";
import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Check, TrendingDown, Users } from "lucide-react";
import { saveCapTable } from "@/lib/db-cap-table";

const shareholderTypes = [
  { value: "founder", label: "Founder" },
  { value: "employee", label: "Employee (ESOP)" },
  { value: "angel", label: "Angel Investor" },
  { value: "vc", label: "VC / Institution" },
  { value: "advisor", label: "Advisor" },
];

interface Shareholder {
  id: string;
  name: string;
  type: string;
  shares: number;
}

interface RoundInputs {
  investmentAmount: number;
  preMoneyValuation: number;
  newEsopPercentage: number;
}

export default function CapTablePage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([
    { id: "1", name: "Founder A", type: "founder", shares: 4000000 },
    { id: "2", name: "Founder B", type: "founder", shares: 3000000 },
    { id: "3", name: "ESOP Pool", type: "employee", shares: 1500000 },
    { id: "4", name: "Angel Syndicate", type: "angel", shares: 1500000 },
  ]);

  const [newShareholder, setNewShareholder] = useState({
    name: "",
    type: "founder",
    shares: "",
  });

  const [roundInputs, setRoundInputs] = useState<RoundInputs>({
    investmentAmount: 2000000,
    preMoneyValuation: 8000000,
    newEsopPercentage: 10,
  });

  const [saved, setSaved] = useState(false);
  const [showPostRound, setShowPostRound] = useState(false);

  // Calculate current cap table state
  const currentState = useMemo(() => {
    const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
    const founderShares = shareholders
      .filter((s) => s.type === "founder")
      .reduce((sum, s) => sum + s.shares, 0);

    return {
      totalShares,
      founderShares,
      shareholders: shareholders.map((s) => ({
        ...s,
        percentage: totalShares > 0 ? (s.shares / totalShares) * 100 : 0,
      })),
    };
  }, [shareholders]);

  // Calculate post-round state
  const postRoundState = useMemo(() => {
    const { investmentAmount, preMoneyValuation, newEsopPercentage } = roundInputs;

    if (!investmentAmount || !preMoneyValuation) {
      return null;
    }

    const postMoneyValuation = preMoneyValuation + investmentAmount;
    const investorOwnership = (investmentAmount / postMoneyValuation) * 100;
    const currentTotalShares = currentState.totalShares;

    // New investor shares (maintain same price per share)
    const pricePerShare = preMoneyValuation / currentTotalShares;
    const investorShares = investmentAmount / pricePerShare;
    const newTotalShares = currentTotalShares + investorShares;

    // Apply ESOP dilution if specified
    let finalTotalShares = newTotalShares;
    let esopShares = 0;

    if (newEsopPercentage > 0) {
      // New ESOP pool shares
      esopShares = (newEsopPercentage / (100 - newEsopPercentage)) * newTotalShares;
      finalTotalShares = newTotalShares + esopShares;
    }

    return {
      postMoneyValuation,
      investorOwnership,
      pricePerShare,
      investorShares,
      esopShares,
      finalTotalShares,
      postRoundShareholders: currentState.shareholders.map((s) => ({
        ...s,
        newShares: s.shares,
        oldPercentage: s.percentage,
        newPercentage: (s.shares / finalTotalShares) * 100,
        dilution: s.percentage - (s.shares / finalTotalShares) * 100,
      })),
    };
  }, [roundInputs, currentState]);

  const handleAddShareholder = useCallback(() => {
    if (!newShareholder.name || !newShareholder.shares) return;

    const newId = Math.random().toString(36).substr(2, 9);
    setShareholders((prev) => [
      ...prev,
      {
        id: newId,
        name: newShareholder.name,
        type: newShareholder.type,
        shares: parseInt(newShareholder.shares),
      },
    ]);

    setNewShareholder({ name: "", type: "founder", shares: "" });
  }, [newShareholder]);

  const handleRemoveShareholder = useCallback((id: string) => {
    setShareholders((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    setShareholders([
      { id: "1", name: "Founder A", type: "founder", shares: 4000000 },
      { id: "2", name: "Founder B", type: "founder", shares: 3000000 },
      { id: "3", name: "ESOP Pool", type: "employee", shares: 1500000 },
      { id: "4", name: "Angel Syndicate", type: "angel", shares: 1500000 },
    ]);
    setRoundInputs({
      investmentAmount: 2000000,
      preMoneyValuation: 8000000,
      newEsopPercentage: 10,
    });
    setShowPostRound(false);
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveCapTable({
        name: `cap_table_${new Date().toISOString()}`,
        total_shares: currentState.totalShares,
        founders_shares: currentState.founderShares,
        series_a_shares: postRoundState?.investorShares || 0,
        series_a_valuation: roundInputs.preMoneyValuation,
        series_a_price_per_share: postRoundState?.pricePerShare || 0,
        fully_diluted_shares: postRoundState?.finalTotalShares || currentState.totalShares,
        option_pool_percentage: roundInputs.newEsopPercentage,
        details: {
          shareholders: currentState.shareholders,
          roundInputs,
          postRound: postRoundState,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[v0] Error saving cap table:", error);
    }
  }, [currentState, roundInputs, postRoundState]);

  const founderDilution =
    postRoundState &&
    currentState.shareholders[0]
      ? currentState.shareholders[0].percentage -
        (postRoundState.postRoundShareholders[0]?.newPercentage || 0)
      : 0;

  const founderRemainControl = postRoundState && currentState.founderShares / (currentState.totalShares + (postRoundState.investorShares || 0)) > 0.5;

  return (
    <ToolPageLayout
      kicker="Cap Table Manager"
      title="Model ownership and dilution."
      description="Track your current cap table and simulate how future funding rounds will affect ownership and control."
    >
      {/* STEP 1: Current Cap Table */}
      <ToolSection title="Step 1: Your Current Cap Table" kicker="Current State">
        <div className="bg-soft border border-border rounded-[var(--radius-md)] p-6 mb-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricBox label="Total Shares" value={currentState.totalShares.toLocaleString()} />
            <MetricBox label="Founder Ownership" value={`${(currentState.founderShares / currentState.totalShares * 100).toFixed(1)}%`} status="good" />
            <MetricBox label="Other Shareholders" value={`${currentState.shareholders.filter(s => s.type !== "founder").length}`} />
          </div>

          <div className="space-y-2">
            {currentState.shareholders.map((s) => (
              <ShareholderDisplay
                key={s.id}
                shareholder={s}
                onRemove={() => handleRemoveShareholder(s.id)}
              />
            ))}
          </div>
        </div>

        {/* Add Shareholder */}
        <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4 mb-4">
          <p className="text-xs font-semibold mb-3 text-muted">ADD NEW SHAREHOLDER</p>
          <FormGrid>
            <InputField
              label="Name"
              id="shareholder_name"
              placeholder="E.g., Venture Partner LLC"
              value={newShareholder.name}
              onChange={(e) =>
                setNewShareholder((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <SelectField
              label="Type"
              id="shareholder_type"
              options={shareholderTypes}
              value={newShareholder.type}
              onChange={(e) =>
                setNewShareholder((prev) => ({ ...prev, type: e.target.value }))
              }
            />
          </FormGrid>
          <FormGrid className="mt-3">
            <InputField
              label="Shares"
              id="shares"
              type="number"
              placeholder="500000"
              value={newShareholder.shares}
              onChange={(e) =>
                setNewShareholder((prev) => ({ ...prev, shares: e.target.value }))
              }
            />
            <div className="flex items-end">
              <Button onClick={handleAddShareholder} size="sm">
                Add Shareholder
              </Button>
            </div>
          </FormGrid>
        </div>
      </ToolSection>

      {/* STEP 2: New Round Assumptions */}
      <ToolSection title="Step 2: New Funding Round" kicker="Simulation Inputs">
        <p className="text-sm text-muted mb-4">
          Define the terms of your next funding round to see how ownership will change.
        </p>

        <FormGrid>
          <InputField
            label="Investment Amount ($)"
            id="investment_amount"
            type="number"
            placeholder="2000000"
            value={roundInputs.investmentAmount}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                investmentAmount: parseInt(e.target.value) || 0,
              }))
            }
            hint="How much capital is being raised"
          />
          <InputField
            label="Pre-Money Valuation ($)"
            id="pre_money"
            type="number"
            placeholder="8000000"
            value={roundInputs.preMoneyValuation}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                preMoneyValuation: parseInt(e.target.value) || 0,
              }))
            }
            hint="Company valuation before this round"
          />
        </FormGrid>

        <FormGrid className="mt-4">
          <InputField
            label="New ESOP Pool (%)"
            id="new_esop"
            type="number"
            placeholder="10"
            value={roundInputs.newEsopPercentage}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                newEsopPercentage: parseInt(e.target.value) || 0,
              }))
            }
            hint="Additional option pool for new hires"
          />
          <div></div>
        </FormGrid>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => setShowPostRound(true)}
            disabled={!roundInputs.investmentAmount || !roundInputs.preMoneyValuation}
          >
            Calculate Round Impact
          </Button>
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </ToolSection>

      {/* STEP 3: Calculation Results */}
      {showPostRound && postRoundState && (
        <ToolSection title="Step 3: Post-Round Cap Table" kicker="Results">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <ResultCard
              label="Post-Money Valuation"
              value={`$${(postRoundState.postMoneyValuation / 1000000).toFixed(1)}M`}
              featured
            />
            <ResultCard
              label="New Investor Ownership"
              value={`${postRoundState.investorOwnership.toFixed(1)}%`}
            />
            <ResultCard
              label="New Share Price"
              value={`$${postRoundState.pricePerShare.toFixed(2)}`}
            />
            <ResultCard
              label="Total Shares (Diluted)"
              value={postRoundState.finalTotalShares.toLocaleString()}
            />
          </div>

          {/* Before/After Comparison */}
          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4 mb-6">
            <p className="text-xs font-semibold mb-3 text-muted">OWNERSHIP CHANGES</p>
            <div className="space-y-2">
              {postRoundState.postRoundShareholders.map((s, idx) => (
                <BeforeAfterRow
                  key={idx}
                  name={s.name}
                  before={s.oldPercentage}
                  after={s.newPercentage}
                  dilution={s.dilution}
                />
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <BeforeAfterRow
                  name="New Investor"
                  before={0}
                  after={postRoundState.investorOwnership}
                  dilution={postRoundState.investorOwnership}
                  isNew
                />
              </div>
            </div>
          </div>
        </ToolSection>
      )}

      {/* STEP 4: Dilution Analysis */}
      {showPostRound && postRoundState && (
        <ToolSection title="Step 4: Dilution Impact Analysis" kicker="Key Insights">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <DilutionInsight
              title="Founder Dilution"
              value={`-${founderDilution.toFixed(1)}%`}
              status={founderDilution > 15 ? "warning" : "good"}
              description={
                founderDilution > 15
                  ? "Significant dilution - consider negotiating terms"
                  : "Reasonable dilution for this round"
              }
            />
            <DilutionInsight
              title="Founder Control"
              value={founderRemainControl ? "Maintained" : "Lost"}
              status={founderRemainControl ? "good" : "warning"}
              description={
                founderRemainControl
                  ? "Founders retain >50% voting control"
                  : "Founders fall below 50% ownership"
              }
            />
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-[var(--radius-md)] p-4">
            <p className="text-sm text-ink">
              <strong>Summary:</strong> This round will raise{" "}
              <span className="font-mono font-bold">
                ${(roundInputs.investmentAmount / 1000000).toFixed(1)}M
              </span>{" "}
              at a{" "}
              <span className="font-mono font-bold">
                ${(roundInputs.preMoneyValuation / 1000000).toFixed(1)}M
              </span>{" "}
              pre-money valuation. The new investor will own{" "}
              <span className="font-mono font-bold">
                {postRoundState.investorOwnership.toFixed(1)}%
              </span>
              , diluting current shareholders by an average of{" "}
              <span className="font-mono font-bold">
                {(postRoundState.postRoundShareholders[0]?.dilution || 0).toFixed(1)}%
              </span>
              .
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={handleSave}>
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved" : "Save Cap Table"}
            </Button>
            <Button variant="secondary" onClick={() => setShowPostRound(false)}>
              Back to Inputs
            </Button>
          </div>
        </ToolSection>
      )}
    </ToolPageLayout>
  );
}

function MetricBox({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "good" | "warning" | "danger";
}) {
  const statusColors = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${status ? statusColors[status] : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ShareholderDisplay({
  shareholder,
  onRemove,
}: {
  shareholder: any;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-background rounded-[var(--radius-sm)] border border-border hover:border-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">
          {shareholder.name.split(" ").map((n: string) => n[0]).join("")}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{shareholder.name}</p>
          <p className="text-xs text-muted capitalize">{shareholder.type}</p>
        </div>
      </div>
      <div className="text-right mr-3">
        <p className="text-sm font-mono font-bold">{shareholder.shares.toLocaleString()}</p>
        <p className="text-xs text-muted">{shareholder.percentage.toFixed(1)}%</p>
      </div>
      <button
        onClick={onRemove}
        className="text-muted hover:text-danger transition-colors text-xs font-semibold"
      >
        Remove
      </button>
    </div>
  );
}

function BeforeAfterRow({
  name,
  before,
  after,
  dilution,
  isNew,
}: {
  name: string;
  before: number;
  after: number;
  dilution: number;
  isNew?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-[var(--radius-sm)] ${
        isNew ? "bg-accent/10" : ""
      }`}
    >
      <p className={`text-sm font-semibold ${isNew ? "text-accent" : ""}`}>{name}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted font-mono w-12 text-right">{before.toFixed(1)}%</span>
        <span className="text-muted text-xs">→</span>
        <span className={`text-xs font-mono font-bold w-12 text-right ${isNew ? "text-accent" : ""}`}>
          {after.toFixed(1)}%
        </span>
        {dilution < 0 && (
          <span className="text-xs font-mono text-warning flex items-center gap-1 w-20 text-right">
            <TrendingDown className="w-3 h-3" />
            {dilution.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  featured,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] p-3 ${
        featured ? "bg-ink text-white" : "bg-soft border border-border"
      }`}
    >
      <p className={`eyebrow mb-1 ${featured ? "text-white/50" : "text-muted"}`}>{label}</p>
      <p className={`text-lg font-bold tracking-tight ${featured ? "text-white" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function DilutionInsight({
  title,
  value,
  status,
  description,
}: {
  title: string;
  value: string;
  status: "good" | "warning" | "danger";
  description: string;
}) {
  const statusColors = {
    good: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
    danger: "border-danger/20 bg-danger/5",
  };

  const statusText = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className={`border rounded-[var(--radius-md)] p-4 ${statusColors[status]}`}>
      <p className="text-xs text-muted mb-2">{title}</p>
      <p className={`text-2xl font-bold mb-2 ${statusText[status]}`}>{value}</p>
      <p className="text-xs text-ink-secondary">{description}</p>
    </div>
  );
}
