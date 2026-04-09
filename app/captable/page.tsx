"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Check, TrendingDown, Users, Plus, Trash2 } from "lucide-react";
import { saveCapTable } from "@/lib/db-cap-table";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { computeCapTableScore } from "@/lib/local-readiness";

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
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  useEffect(() => { setCompletedSteps(getCompletedSteps()); }, []);

  useEffect(() => {
    if (saved) {
      markStepComplete("captable");
      setCompletedSteps(getCompletedSteps());
    }
  }, [saved]);

  // Calculate current cap table state
  const currentState = useMemo(() => {
    const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
    const founderShares = shareholders
      .filter((s) => s.type === "founder")
      .reduce((sum, s) => sum + s.shares, 0);
    const founderPercentage = totalShares > 0 ? (founderShares / totalShares) * 100 : 0;

    return {
      totalShares,
      founderShares,
      founderPercentage,
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
    const investorOwnershipPercent = (investmentAmount / postMoneyValuation) * 100;
    const currentTotalShares = currentState.totalShares;

    // Calculate price per share and investor shares
    const pricePerShare = preMoneyValuation / currentTotalShares;
    const investorShares = investmentAmount / pricePerShare;
    const newTotalSharesBeforeEsop = currentTotalShares + investorShares;

    // Calculate final shares with ESOP
    let finalTotalShares = newTotalSharesBeforeEsop;
    let esopShares = 0;

    if (newEsopPercentage > 0) {
      esopShares = (newEsopPercentage / (100 - newEsopPercentage)) * newTotalSharesBeforeEsop;
      finalTotalShares = newTotalSharesBeforeEsop + esopShares;
    }

    // Calculate post-round percentages
    const founderSharesPostRound = currentState.founderShares;
    const founderPercentagePostRound = (founderSharesPostRound / finalTotalShares) * 100;
    const dilution = currentState.founderPercentage - founderPercentagePostRound;

    return {
      postMoneyValuation,
      investorOwnershipPercent,
      investorShares: Math.round(investorShares),
      esopShares: Math.round(esopShares),
      finalTotalShares: Math.round(finalTotalShares),
      pricePerShare: pricePerShare.toFixed(4),
      founderPercentagePostRound,
      dilution,
      founderControlMaintained: founderPercentagePostRound > 50,
    };
  }, [roundInputs, currentState]);

  const handleAddShareholder = useCallback(() => {
    if (!newShareholder.name || !newShareholder.shares) return;

    setShareholders((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newShareholder.name,
        type: newShareholder.type,
        shares: parseFloat(newShareholder.shares),
      },
    ]);

    setNewShareholder({ name: "", type: "founder", shares: "" });
  }, [newShareholder]);

  const handleRemoveShareholder = useCallback((id: string) => {
    setShareholders((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveCapTable({
        name: `cap_table_${new Date().toISOString()}`,
        total_shares: currentState.totalShares,
        founders_shares: currentState.founderShares,
        series_a_shares: postRoundState?.investorShares || 0,
        series_a_valuation: roundInputs.preMoneyValuation,
        series_a_price_per_share: parseFloat(postRoundState?.pricePerShare || "0"),
        fully_diluted_shares: postRoundState?.finalTotalShares || currentState.totalShares,
        option_pool_percentage: roundInputs.newEsopPercentage,
        details: {
          shareholders: currentState.shareholders,
          postRound: postRoundState,
        },
      });
    } catch (error) {
      console.error("[v0] Error saving cap table:", error);
    }
    // Persist score to localStorage for local readiness engine
    const hasEsop =
      roundInputs.newEsopPercentage > 0 ||
      currentState.shareholders.some((s) => s.type === "employee");
    const hasInvestors = currentState.shareholders.some(
      (s) => s.type === "angel" || s.type === "vc"
    );
    const score = computeCapTableScore(
      currentState.founderPercentage,
      hasEsop,
      hasInvestors
    );
    localStorage.setItem("vcready_captable", JSON.stringify({ score }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [currentState, postRoundState, roundInputs]);

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

  return (
    <ToolPageLayout
      kicker="Cap Table"
      title="Model your ownership structure."
      description="Understand current and post-round cap table, dilution impact, and founder control."
    >
      <FlowProgress currentStep="captable" completedSteps={completedSteps} />
      {/* Step 1: Current Cap Table */}
      <ToolSection title="Step 1: Current Cap Table">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Your current shareholders and ownership structure
          </p>

          {/* Current Holdings Table */}
          <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
            <div className="bg-soft border-b border-border p-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-sm">Current Shareholders</span>
              <span className="text-xs text-muted ml-auto">
                {currentState.totalShares.toLocaleString()} total shares
              </span>
            </div>

            <div className="divide-y divide-border">
              {currentState.shareholders.map((s) => (
                <div
                  key={s.id}
                  className="p-3 flex items-center justify-between hover:bg-soft transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{s.name}</span>
                      <Badge variant="default" className="shrink-0">
                        {shareholderTypes.find((t) => t.value === s.type)?.label || s.type}
                      </Badge>
                    </div>
                    <ProgressBar value={s.percentage} size="sm" />
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <div className="font-mono text-sm font-semibold">
                      {s.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted">
                      {s.shares.toLocaleString()} shares
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveShareholder(s.id)}
                    className="ml-3 p-1.5 text-muted hover:text-danger hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Shareholder Form */}
          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
            <h4 className="font-semibold text-sm mb-3">Add Shareholder</h4>
            <FormGrid cols={2}>
              <InputField
                id="shareholder-name"
                label="Name"
                placeholder="e.g., New Investor"
                value={newShareholder.name}
                onChange={(e) =>
                  setNewShareholder((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <SelectField
                id="shareholder-type"
                label="Type"
                value={newShareholder.type}
                onChange={(e) =>
                  setNewShareholder((prev) => ({ ...prev, type: e.target.value }))
                }
                options={shareholderTypes}
              />
              <InputField
                id="shareholder-shares"
                label="Shares"
                placeholder="e.g., 1000000"
                type="number"
                value={newShareholder.shares}
                onChange={(e) =>
                  setNewShareholder((prev) => ({ ...prev, shares: e.target.value }))
                }
              />
              <div className="flex items-end">
                <Button
                  onClick={handleAddShareholder}
                  disabled={!newShareholder.name || !newShareholder.shares}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </FormGrid>
          </div>
        </div>
      </ToolSection>

      {/* Step 2: New Round Assumptions */}
      <ToolSection title="Step 2: New Round Assumptions">
        <p className="text-sm text-ink-secondary mb-4">
          Model the impact of a new funding round
        </p>
        <FormGrid cols={3}>
          <InputField
            id="investment-amount"
            label="Investment Amount"
            type="number"
            value={roundInputs.investmentAmount}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                investmentAmount: parseFloat(e.target.value) || 0,
              }))
            }
            hint="New investment size in dollars"
          />
          <InputField
            id="pre-money-valuation"
            label="Pre-Money Valuation"
            type="number"
            value={roundInputs.preMoneyValuation}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                preMoneyValuation: parseFloat(e.target.value) || 0,
              }))
            }
            hint="Company value before investment"
          />
          <InputField
            id="new-esop-percentage"
            label="New ESOP %"
            type="number"
            value={roundInputs.newEsopPercentage}
            onChange={(e) =>
              setRoundInputs((prev) => ({
                ...prev,
                newEsopPercentage: parseFloat(e.target.value) || 0,
              }))
            }
            hint="Option pool to reserve for employees"
          />
        </FormGrid>
      </ToolSection>

      {/* Step 3: Calculation Button */}
      <div className="flex gap-2">
        <Button onClick={() => setShowPostRound(true)} size="lg" className="flex-1">
          Calculate Post-Round Cap Table
        </Button>
      </div>

      {/* Step 4: Post-Round Results */}
      {showPostRound && postRoundState && (
        <ToolSection title="Step 3: Post-Round Results">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Financial Summary */}
            <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
              <h4 className="font-semibold text-sm mb-3">Financing Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-secondary">Investment</span>
                  <span className="font-mono font-semibold">
                    ${roundInputs.investmentAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-secondary">Pre-Money Val.</span>
                  <span className="font-mono font-semibold">
                    ${roundInputs.preMoneyValuation.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-2">
                  <span className="text-sm font-medium">Post-Money Val.</span>
                  <span className="font-mono font-bold">
                    ${postRoundState.postMoneyValuation.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-secondary">Price/Share</span>
                  <span className="font-mono font-semibold">
                    ${postRoundState.pricePerShare}
                  </span>
                </div>
              </div>
            </div>

            {/* Ownership Summary */}
            <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
              <h4 className="font-semibold text-sm mb-3">Post-Round Ownership</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-ink-secondary">Founders</span>
                    <span
                      className={`font-mono font-semibold ${
                        postRoundState.founderPercentagePostRound > 50
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {postRoundState.founderPercentagePostRound.toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={postRoundState.founderPercentagePostRound}
                    status={
                      postRoundState.founderPercentagePostRound > 50 ? "good" : "warning"
                    }
                    size="sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-ink-secondary">New Investor</span>
                    <span className="font-mono font-semibold">
                      {postRoundState.investorOwnershipPercent.toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={postRoundState.investorOwnershipPercent}
                    status="neutral"
                    size="sm"
                  />
                </div>

                <div className="border-t border-border pt-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-warning" />
                    <span className="text-sm text-ink-secondary">Founder Dilution</span>
                    <span className="font-mono font-bold ml-auto">
                      {postRoundState.dilution.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Control Analysis */}
          <div
            className={`border rounded-[var(--radius-md)] p-4 ${
              postRoundState.founderControlMaintained
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={postRoundState.founderControlMaintained ? "success" : "warning"}
              >
                {postRoundState.founderControlMaintained
                  ? "Control Maintained"
                  : "Control Lost"}
              </Badge>
              <h4 className="font-semibold text-sm">Investor Insight</h4>
            </div>
            <p className="text-sm text-ink-secondary">
              {postRoundState.founderControlMaintained
                ? `Your team maintains majority control with ${postRoundState.founderPercentagePostRound.toFixed(
                    1
                  )}% ownership after this round. Strong founder alignment with investors.`
                : `After this round, founders own ${postRoundState.founderPercentagePostRound.toFixed(
                    1
                  )}% of the company. Consider negotiating terms to maintain control.`}
            </p>
          </div>

          {/* Dilution Details */}
          <div className="mt-6 grid md:grid-cols-2 gap-4 bg-soft border border-border rounded-[var(--radius-md)] p-4">
            <div>
              <h4 className="font-semibold text-sm mb-3">Share Count Changes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Current Total</span>
                  <span className="font-mono">
                    {currentState.totalShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">New Investor Shares</span>
                  <span className="font-mono">
                    +{postRoundState.investorShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">New ESOP Shares</span>
                  <span className="font-mono">
                    +{postRoundState.esopShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2">
                  <span>Post-Round Total</span>
                  <span className="font-mono">
                    {postRoundState.finalTotalShares.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Key Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Investor Ownership</span>
                  <span className="font-mono">
                    {postRoundState.investorOwnershipPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Founder Dilution</span>
                  <span className="font-mono text-warning">
                    -{postRoundState.dilution.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">ESOP Pool</span>
                  <span className="font-mono">
                    {roundInputs.newEsopPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ToolSection>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleReset} variant="secondary" size="sm">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button onClick={handleSave} size="sm">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save Cap Table"}
        </Button>
      </div>
      <FlowContinue isComplete={completedSteps.includes("captable")} nextHref="/pitch" nextLabel="Pitch" />
    </ToolPageLayout>
  );
}
