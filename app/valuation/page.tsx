"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Check } from "lucide-react";
import { calculateFullValuation, type ProjectionInputs } from "@/lib/valuation-methods";
import { saveValuation } from "@/lib/db-valuation";
import { saveReadinessSnapshot } from "@/lib/local-readiness";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";

type Stage = "Pre-Seed" | "Seed" | "Series A" | "Series B" | "Series C";
type Sector = "SaaS" | "Fintech" | "AgriTech" | "Health Tech" | "Consumer Tech" | "Other";

interface ValuationFormData {
  currentRevenue: number;
  baseGrowthRatePct: number;
  sector: Sector;
  stage: Stage;
  investmentAmount: number;
  investorEquity: number;
  targetIRR: number;
  exitYears: number;
  exitRevenueMultiple: number;
  dilutionPerRound: number;
  futureRounds: number;
  margin2026: number;
  margin2027: number;
  margin2028: number;
  margin2029: number;
  margin2030: number;
}

const defaultFormData: ValuationFormData = {
  currentRevenue: 0,
  baseGrowthRatePct: 50,
  sector: "SaaS",
  stage: "Seed",
  investmentAmount: 500000,
  investorEquity: 15,
  targetIRR: 0.3,
  exitYears: 5,
  exitRevenueMultiple: 8,
  dilutionPerRound: 15,
  futureRounds: 2,
  margin2026: -0.2,
  margin2027: -0.1,
  margin2028: 0,
  margin2029: 0.1,
  margin2030: 0.2,
};

export default function ValuationPage() {
  const [formData, setFormData] = useState<ValuationFormData>(defaultFormData);
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    try {
      const raw = localStorage.getItem("vcready_valuation_inputs");
      if (raw) {
        const savedState = JSON.parse(raw) as { formData?: ValuationFormData };
        if (savedState.formData) setFormData(savedState.formData);
      }
    } catch {
      // ignore
    }

    getToolFromDB("valuation").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as { formData?: ValuationFormData };
      if (inp.formData) setFormData(inp.formData);
    });
  }, []);

  const notifyFoundationRefresh = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  };

  const isComplete =
    formData.currentRevenue > 0 &&
    formData.investmentAmount > 0 &&
    formData.investorEquity > 0 &&
    formData.exitYears > 0 &&
    formData.exitRevenueMultiple > 0;

  useEffect(() => {
    if (isComplete) {
      markStepComplete("valuation");
      setCompletedSteps(getCompletedSteps());
    }
  }, [isComplete]);

  const updateField = useCallback(
    <K extends keyof ValuationFormData>(field: K, value: ValuationFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setSaved(false);
    },
    []
  );

  const handleReset = useCallback(() => {
    setFormData(defaultFormData);
    setSaved(false);
  }, []);

  const projectionInputs: ProjectionInputs = useMemo(
    () => ({
      currentRevenue: formData.currentRevenue,
      baseRevenueGrowth: formData.baseGrowthRatePct,
      margin2026: formData.margin2026,
      margin2027: formData.margin2027,
      margin2028: formData.margin2028,
      margin2029: formData.margin2029,
      margin2030: formData.margin2030,
    }),
    [formData]
  );

  const summary = useMemo(() => {
    return calculateFullValuation({
      currentRevenue: formData.currentRevenue,
      sector: formData.sector,
      stage: formData.stage,
      baseGrowthRate: formData.baseGrowthRatePct / 100,
      projectionInputs,
      investmentAmount: formData.investmentAmount,
      investorEquity: formData.investorEquity,
      targetIRR: formData.targetIRR,
      exitYears: formData.exitYears,
      exitRevenueMultiple: formData.exitRevenueMultiple,
      dilutionPerRound: formData.dilutionPerRound,
      futureRounds: formData.futureRounds,
    });
  }, [formData, projectionInputs]);

  const estimatedValuation = Math.round(summary.blended.base);
  const valuationLow = Math.round(summary.blended.low);
  const valuationHigh = Math.round(summary.blended.high);

  const readinessScore = useMemo(() => {
    let score = 0;

    if (estimatedValuation > 0) score += 40;
    if (formData.currentRevenue > 0) score += 20;
    if (formData.baseGrowthRatePct >= 20) score += 15;
    if (formData.investmentAmount > 0 && formData.investorEquity > 0) score += 15;
    if (formData.sector && formData.stage) score += 10;

    return Math.min(100, score);
  }, [estimatedValuation, formData]);

  const handleSave = useCallback(async () => {
    try {
     await saveValuation({
  name: `valuation_${new Date().toISOString()}`,
  current_revenue: formData.currentRevenue,
  growth_rate: formData.baseGrowthRatePct,
  sector: formData.sector,
  stage: formData.stage,
  investment_amount: formData.investmentAmount,
  investor_equity: formData.investorEquity,
  target_irr: formData.targetIRR,
  exit_years: formData.exitYears,
  exit_revenue_multiple: formData.exitRevenueMultiple,
  revenue_multiple: summary.averageMultiple,
  estimated_valuation: estimatedValuation,
  valuation_low: valuationLow,
  valuation_high: valuationHigh,
  vc_method_valuation: summary.vcMethod.valuation,
  comparables_valuation: summary.comparables.valuation,
  blended_low: summary.blended.low,
  blended_base: summary.blended.base,
  blended_high: summary.blended.high,
  pre_money: estimatedValuation,
  post_money: estimatedValuation + formData.investmentAmount,
  investor_equity_at_exit: formData.investorEquity,
  exit_proceeds: 0,
  cash_on_cash: 0,
  implied_irr: summary.investor.impliedIRR,
});
    } catch (error) {
      console.error("[v0] Error saving valuation:", error);
    }

    localStorage.setItem(
      "vcready_valuation",
      JSON.stringify({
        score: readinessScore,
        estimated_valuation: estimatedValuation,
        valuation_low: valuationLow,
        valuation_high: valuationHigh,
        sector: formData.sector,
        stage: formData.stage,
        growth_rate: formData.baseGrowthRatePct,
        saved_at: new Date().toISOString(),
      })
    );

    localStorage.setItem(
      "vcready_valuation_inputs",
      JSON.stringify({
        formData,
      })
    );

    saveReadinessSnapshot();

    saveToolToDB("valuation", readinessScore, {
      formData: formData as unknown as Record<string, unknown>,
      derived: {
        estimated_valuation: estimatedValuation,
        valuation_low: valuationLow,
        valuation_high: valuationHigh,
        vc_method: summary.vcMethod.valuation,
        revenue_multiple: summary.revenueMultiple.valuation,
        comparables: summary.comparables.valuation,
        average_multiple: summary.averageMultiple,
        implied_irr: summary.investor.impliedIRR,
      } as unknown as Record<string, unknown>,
    }).catch(console.error);

    notifyFoundationRefresh();

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [
    formData,
    estimatedValuation,
    valuationLow,
    valuationHigh,
    readinessScore,
    summary,
  ]);

  const stageOptions = [
    { value: "Pre-seed", label: "Pre-seed" },
    { value: "Seed", label: "Seed" },
    { value: "Series A", label: "Series A" },
    { value: "Series B", label: "Series B" },
    { value: "Series C", label: "Series C" },
  ];

  const sectorOptions = [
    { value: "SaaS", label: "SaaS" },
    { value: "Fintech", label: "Fintech" },
    { value: "AgriTech", label: "AgriTech" },
    { value: "Health Tech", label: "Health Tech" },
    { value: "Consumer Tech", label: "Consumer Tech" },
    { value: "Other", label: "Other" },
  ];

  return (
    <ToolPageLayout
      kicker="Valuation"
      title="Model your valuation with proven methods."
      description="Estimate a realistic fundraising range using VC Method, revenue multiples, and comparables."
    >
      <FlowProgress currentStep="valuation" completedSteps={completedSteps} />

      <ToolSection title="Company Inputs">
        <FormGrid cols={2}>
          <InputField
            id="current-revenue"
            label="Current Revenue ($)"
            type="number"
            value={formData.currentRevenue}
            onChange={(e) => updateField("currentRevenue", Number(e.target.value))}
            hint="Current annualized revenue"
          />
          <InputField
            id="base-growth-rate"
            label="Base Growth Rate (%)"
            type="number"
            value={formData.baseGrowthRatePct}
            onChange={(e) => updateField("baseGrowthRatePct", Number(e.target.value))}
            hint="Expected annual growth rate"
          />
          <SelectField
            id="sector"
            label="Sector"
            value={formData.sector}
            onChange={(e) => updateField("sector", e.target.value as Sector)}
            options={sectorOptions}
          />
          <SelectField
            id="stage"
            label="Stage"
            value={formData.stage}
            onChange={(e) => updateField("stage", e.target.value as Stage)}
            options={stageOptions}
          />
        </FormGrid>
      </ToolSection>

      <ToolSection title="Fundraising Assumptions">
        <FormGrid cols={3}>
          <InputField
            id="investment-amount"
            label="Investment Amount ($)"
            type="number"
            value={formData.investmentAmount}
            onChange={(e) => updateField("investmentAmount", Number(e.target.value))}
            hint="New capital raised"
          />
          <InputField
            id="investor-equity"
            label="Investor Equity (%)"
            type="number"
            value={formData.investorEquity}
            onChange={(e) => updateField("investorEquity", Number(e.target.value))}
            hint="Equity offered in this round"
          />
          <InputField
            id="target-irr"
            label="Target IRR"
            type="number"
            value={formData.targetIRR}
            onChange={(e) => updateField("targetIRR", Number(e.target.value))}
            hint="Investor target return (e.g. 0.30)"
          />
          <InputField
            id="exit-years"
            label="Exit Years"
            type="number"
            value={formData.exitYears}
            onChange={(e) => updateField("exitYears", Number(e.target.value))}
            hint="Expected holding period"
          />
          <InputField
            id="exit-revenue-multiple"
            label="Exit Revenue Multiple"
            type="number"
            value={formData.exitRevenueMultiple}
            onChange={(e) => updateField("exitRevenueMultiple", Number(e.target.value))}
            hint="Revenue multiple at exit"
          />
          <InputField
            id="future-rounds"
            label="Future Rounds"
            type="number"
            value={formData.futureRounds}
            onChange={(e) => updateField("futureRounds", Number(e.target.value))}
            hint="Expected future financing rounds"
          />
        </FormGrid>
      </ToolSection>

      <ToolSection title="Dilution & Margin Assumptions">
        <FormGrid cols={3}>
          <InputField
            id="dilution-per-round"
            label="Dilution per Round (%)"
            type="number"
            value={formData.dilutionPerRound}
            onChange={(e) => updateField("dilutionPerRound", Number(e.target.value))}
            hint="Expected dilution at each future round"
          />
          <InputField
            id="margin-2026"
            label="Margin 2026"
            type="number"
            value={formData.margin2026}
            onChange={(e) => updateField("margin2026", Number(e.target.value))}
          />
          <InputField
            id="margin-2027"
            label="Margin 2027"
            type="number"
            value={formData.margin2027}
            onChange={(e) => updateField("margin2027", Number(e.target.value))}
          />
          <InputField
            id="margin-2028"
            label="Margin 2028"
            type="number"
            value={formData.margin2028}
            onChange={(e) => updateField("margin2028", Number(e.target.value))}
          />
          <InputField
            id="margin-2029"
            label="Margin 2029"
            type="number"
            value={formData.margin2029}
            onChange={(e) => updateField("margin2029", Number(e.target.value))}
          />
          <InputField
            id="margin-2030"
            label="Margin 2030"
            type="number"
            value={formData.margin2030}
            onChange={(e) => updateField("margin2030", Number(e.target.value))}
          />
        </FormGrid>
      </ToolSection>

      <ToolSection title="Estimated Valuation Range">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
            <p className="eyebrow mb-1">Low</p>
            <p className="text-2xl font-extrabold font-mono tracking-tight">
              ${valuationLow.toLocaleString()}
            </p>
          </div>
          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
            <p className="eyebrow mb-1">Base</p>
            <p className="text-2xl font-extrabold font-mono tracking-tight">
              ${estimatedValuation.toLocaleString()}
            </p>
          </div>
          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
            <p className="eyebrow mb-1">High</p>
            <p className="text-2xl font-extrabold font-mono tracking-tight">
              ${valuationHigh.toLocaleString()}
            </p>
          </div>
        </div>
      </ToolSection>

      <ToolSection title="Method Breakdown">
        <div className="grid md:grid-cols-3 gap-4">
          <MethodCard
            title="VC Method"
            value={summary.vcMethod.valuation}
            reasoning={summary.vcMethod.reasoning}
          />
          <MethodCard
            title="Revenue Multiple"
            value={summary.revenueMultiple.valuation}
            reasoning={summary.revenueMultiple.reasoning}
          />
          <MethodCard
            title="Comparables"
            value={summary.comparables.valuation}
            reasoning={summary.comparables.reasoning}
          />
        </div>
      </ToolSection>

      <ToolSection title="Investor Readiness">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight mb-1">
              {readinessScore}
              <span className="text-muted text-xl">/100</span>
            </p>
            <p className="text-sm text-ink-secondary">Valuation preparation score</p>
          </div>
          <Badge
            variant={
              readinessScore >= 70
                ? "success"
                : readinessScore >= 50
                ? "warning"
                : "danger"
            }
          >
            {readinessScore >= 70
              ? "Ready"
              : readinessScore >= 50
              ? "Improving"
              : "Needs work"}
          </Badge>
        </div>
        <ProgressBar
          value={readinessScore}
          status={
            readinessScore >= 70
              ? "good"
              : readinessScore >= 50
              ? "warning"
              : "danger"
          }
        />
      </ToolSection>

      <ToolSection title="Key Insights">
        <div className="space-y-3">
          {summary.analysis.map((text, index) => (
            <div
              key={index}
              className="bg-soft border border-border rounded-[var(--radius-md)] p-4"
            >
              <p className="text-sm text-ink-secondary">{text}</p>
            </div>
          ))}
        </div>
      </ToolSection>

      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-[var(--radius-lg)] p-6">
        <p className="text-sm text-muted">
          Sector: {formData.sector} · Stage: {formData.stage}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleReset} variant="secondary" size="sm">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleSave} size="sm">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved" : "Save Valuation"}
          </Button>
        </div>
      </div>

      <FlowContinue
        isComplete={isComplete}
        nextHref="/qa"
        nextLabel="Q&A"
      />
    </ToolPageLayout>
  );
}

function MethodCard({
  title,
  value,
  reasoning,
}: {
  title: string;
  value: number;
  reasoning: string;
}) {
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <p className="eyebrow mb-1">{title}</p>
      <p className="text-2xl font-extrabold font-mono tracking-tight">
        ${Math.round(value).toLocaleString()}
      </p>
      <p className="text-xs text-muted mt-2 leading-relaxed">{reasoning}</p>
    </div>
  );
}