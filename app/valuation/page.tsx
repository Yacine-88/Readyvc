"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { InputField, SelectField, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Check, AlertTriangle, TrendingUp } from "lucide-react";
import {
  calculateValuationV2,
  METHOD_META,
  type ProjectionInputs,
  type BerkusFactors,
  type ScorecardFactors,
  type MethodKey,
  type MethodContribution,
} from "@/lib/valuation-methods";
import { saveValuation } from "@/lib/db-valuation";
import { saveReadinessSnapshot } from "@/lib/local-readiness";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { track } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "Pre-seed" | "Seed" | "Series A" | "Series B" | "Series C";
type Sector = string;

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

interface QualitativeData {
  berkus: BerkusFactors;
  scorecard: ScorecardFactors;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultFormData: ValuationFormData = {
  currentRevenue: 0,
  baseGrowthRatePct: 50,
  sector: "SaaS / B2B Software",
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

const defaultQualitative: QualitativeData = {
  berkus: {
    soundIdea: 60,
    prototype: 50,
    qualityTeam: 60,
    strategicRelationships: 40,
    productRollout: 30,
  },
  scorecard: {
    team: 100,
    opportunity: 100,
    product: 100,
    competition: 100,
    marketing: 100,
    capitalNeeds: 100,
    other: 100,
  },
};

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtM(v: number): string {
  if (!isFinite(v) || v <= 0) return "—";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(v < 10_000_000 ? 2 : 1)}M`;
  if (v >= 1_000)         return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const [formData, setFormData] = useState<ValuationFormData>(defaultFormData);
  const [qualitative, setQualitative] = useState<QualitativeData>(defaultQualitative);
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);
  const trackedOpen = useRef(false);

  useEffect(() => {
    if (!trackedOpen.current) {
      trackedOpen.current = true;
      track("tool_opened", { tool: "valuation" });
    }
  }, []);

  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    try {
      const raw = localStorage.getItem("vcready_valuation_inputs");
      if (raw) {
        const s = JSON.parse(raw) as { formData?: ValuationFormData; qualitative?: QualitativeData };
        if (s.formData)     setFormData(s.formData);
        if (s.qualitative)  setQualitative(s.qualitative);
      }
    } catch { /* ignore */ }

    getToolFromDB("valuation").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as { formData?: ValuationFormData; qualitative?: QualitativeData };
      if (inp.formData)     setFormData(inp.formData);
      if (inp.qualitative)  setQualitative(inp.qualitative);
    });
  }, []);

  const notifyFoundationRefresh = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  };

  const isComplete =
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
    }, [],
  );

  const updateBerkus = useCallback(
    (key: keyof BerkusFactors, value: number) => {
      setQualitative((prev) => ({ ...prev, berkus: { ...prev.berkus, [key]: value } }));
      setSaved(false);
    }, [],
  );

  const updateScorecard = useCallback(
    (key: keyof ScorecardFactors, value: number) => {
      setQualitative((prev) => ({ ...prev, scorecard: { ...prev.scorecard, [key]: value } }));
      setSaved(false);
    }, [],
  );

  const projectionInputs: ProjectionInputs = useMemo(() => ({
    currentRevenue:    formData.currentRevenue,
    baseRevenueGrowth: formData.baseGrowthRatePct,
    margin2026: formData.margin2026,
    margin2027: formData.margin2027,
    margin2028: formData.margin2028,
    margin2029: formData.margin2029,
    margin2030: formData.margin2030,
  }), [formData]);

  const summary = useMemo(() => calculateValuationV2({
    currentRevenue:     formData.currentRevenue,
    sector:             formData.sector,
    stage:              formData.stage,
    baseGrowthRate:     formData.baseGrowthRatePct / 100,
    projectionInputs,
    investmentAmount:   formData.investmentAmount,
    investorEquity:     formData.investorEquity,
    targetIRR:          formData.targetIRR,
    exitYears:          formData.exitYears,
    exitRevenueMultiple:formData.exitRevenueMultiple,
    dilutionPerRound:   formData.dilutionPerRound,
    futureRounds:       formData.futureRounds,
    qualitative,
  }), [formData, projectionInputs, qualitative]);

  const estimatedValuation = Math.round(summary.blended.base);
  const valuationLow       = Math.round(summary.blended.low);
  const valuationHigh      = Math.round(summary.blended.high);

  const readinessScore = useMemo(() => {
    let s = 0;
    if (estimatedValuation > 0) s += 40;
    if (formData.currentRevenue > 0) s += 20;
    if (formData.baseGrowthRatePct >= 20) s += 15;
    if (formData.investmentAmount > 0 && formData.investorEquity > 0) s += 15;
    if (formData.sector && formData.stage) s += 10;
    return Math.min(100, s);
  }, [estimatedValuation, formData]);

  const isEarlyStage = formData.stage === "Pre-seed" || formData.stage === "Seed";

  const handleSave = useCallback(async () => {
    try {
      await saveValuation({
        name: `valuation_${new Date().toISOString()}`,
        current_revenue:     formData.currentRevenue,
        growth_rate:         formData.baseGrowthRatePct,
        sector:              formData.sector,
        stage:               formData.stage,
        investment_amount:   formData.investmentAmount,
        investor_equity:     formData.investorEquity,
        target_irr:          formData.targetIRR,
        exit_years:          formData.exitYears,
        exit_revenue_multiple: formData.exitRevenueMultiple,
        revenue_multiple:    summary.averageMultiple,
        estimated_valuation: estimatedValuation,
        valuation_low:       valuationLow,
        valuation_high:      valuationHigh,
        vc_method_valuation: summary.vcMethod.valuation,
        comparables_valuation: summary.comparables.valuation,
        blended_low:         summary.blended.low,
        blended_base:        summary.blended.base,
        blended_high:        summary.blended.high,
        pre_money:           estimatedValuation,
        post_money:          estimatedValuation + formData.investmentAmount,
        investor_equity_at_exit: formData.investorEquity,
        exit_proceeds:       0,
        cash_on_cash:        0,
        implied_irr:         summary.investor.impliedIRR,
      });
    } catch (error) {
      console.error("[valuation] Error saving:", error);
    }

    localStorage.setItem("vcready_valuation", JSON.stringify({
      score:              readinessScore,
      estimated_valuation: estimatedValuation,
      valuation_low:      valuationLow,
      valuation_high:     valuationHigh,
      sector:             formData.sector,
      stage:              formData.stage,
      growth_rate:        formData.baseGrowthRatePct,
      saved_at:           new Date().toISOString(),
    }));

    localStorage.setItem("vcready_valuation_inputs", JSON.stringify({ formData, qualitative }));

    saveReadinessSnapshot();

    saveToolToDB("valuation", readinessScore, {
      formData:    formData as unknown as Record<string, unknown>,
      qualitative: qualitative as unknown as Record<string, unknown>,
      derived: {
        estimated_valuation: estimatedValuation,
        valuation_low:       valuationLow,
        valuation_high:      valuationHigh,
        vc_method:           summary.vcMethod.valuation,
        revenue_multiple:    summary.revenueMultiple.valuation,
        comparables:         summary.comparables.valuation,
        berkus:              summary.berkus.valuation,
        scorecard:           summary.scorecard.valuation,
        average_multiple:    summary.averageMultiple,
        implied_irr:         summary.investor.impliedIRR,
        positioning:         summary.interpretation.positioning,
        primary_method:      summary.interpretation.primaryMethod,
      } as unknown as Record<string, unknown>,
    }).catch(console.error);

    notifyFoundationRefresh();

    track("tool_saved", { tool: "valuation", score: readinessScore });
    track("valuation_saved", { score: readinessScore, sector: formData.sector, stage: formData.stage });
    if (readinessScore >= 70) track("tool_completed", { tool: "valuation", score: readinessScore });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [formData, qualitative, estimatedValuation, valuationLow, valuationHigh, readinessScore, summary]);

  const handleReset = useCallback(() => {
    setFormData(defaultFormData);
    setQualitative(defaultQualitative);
    setSaved(false);
  }, []);

  const stageOptions: { value: Stage; label: string }[] = [
    { value: "Pre-seed", label: "Pre-seed" },
    { value: "Seed", label: "Seed" },
    { value: "Series A", label: "Series A" },
    { value: "Series B", label: "Series B" },
    { value: "Series C", label: "Series C" },
  ];

  const sectorOptions = [
    { value: "AI / Machine Learning",       label: "AI / Machine Learning" },
    { value: "SaaS / B2B Software",         label: "SaaS / B2B Software" },
    { value: "Developer Tools",             label: "Developer Tools" },
    { value: "Cybersecurity",               label: "Cybersecurity" },
    { value: "Fintech",                     label: "Fintech" },
    { value: "InsurTech",                   label: "InsurTech" },
    { value: "Healthtech / Digital Health", label: "Healthtech / Digital Health" },
    { value: "Biotech",                     label: "Biotech" },
    { value: "MedTech",                     label: "MedTech" },
    { value: "Marketplace",                 label: "Marketplace" },
    { value: "Consumer App",                label: "Consumer App" },
    { value: "E-commerce",                  label: "E-commerce" },
    { value: "Edtech",                      label: "Edtech" },
    { value: "Legaltech",                   label: "Legaltech" },
    { value: "HRtech / Future of Work",     label: "HRtech / Future of Work" },
    { value: "Proptech",                    label: "Proptech" },
    { value: "Logistics / Supply Chain",    label: "Logistics / Supply Chain" },
    { value: "Cleantech / Climate",         label: "Cleantech / Climate" },
    { value: "AgriTech",                    label: "AgriTech" },
    { value: "DeepTech",                    label: "DeepTech" },
    { value: "Other",                       label: "Other" },
  ];

  return (
    <ToolPageLayout
      kicker="Valuation Engine v2"
      title="Build a defensible, investor-ready valuation."
      description="Multi-method valuation with full methodology transparency. Each method is scored, weighted by stage, and explained — so you know exactly why your number is what it is, and how to defend it."
    >
      <FlowProgress currentStep="valuation" completedSteps={completedSteps} />

      {/* ── Company inputs ────────────────────────────────────────────────── */}
      <ToolSection title="Company Inputs">
        <FormGrid cols={2}>
          <InputField
            id="current-revenue"
            label="Current Revenue ($)"
            type="number"
            value={formData.currentRevenue}
            onChange={(e) => updateField("currentRevenue", Number(e.target.value))}
            hint="Current annualised revenue (ARR). Enter 0 if pre-revenue."
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

      {/* ── Qualitative signals (pre-seed / seed) ─────────────────────────── */}
      {isEarlyStage && (
        <ToolSection title="Qualitative Signals (Berkus & Scorecard)">
          <p className="text-xs text-muted mb-4 leading-relaxed">
            At early stage, qualitative factors drive valuation more than revenue multiples.
            Rate honestly — investors discount founder self-assessment by ~15%.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Berkus factors */}
            <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
              <p className="eyebrow mb-3">Berkus (0–100 per factor, contributes up to $500K each)</p>
              <div className="space-y-3">
                <FactorSlider label="Sound idea"              value={qualitative.berkus.soundIdea}              onChange={(v) => updateBerkus("soundIdea", v)}              max={100} />
                <FactorSlider label="Prototype / MVP"         value={qualitative.berkus.prototype}              onChange={(v) => updateBerkus("prototype", v)}              max={100} />
                <FactorSlider label="Quality management team" value={qualitative.berkus.qualityTeam}            onChange={(v) => updateBerkus("qualityTeam", v)}            max={100} />
                <FactorSlider label="Strategic relationships" value={qualitative.berkus.strategicRelationships} onChange={(v) => updateBerkus("strategicRelationships", v)} max={100} />
                <FactorSlider label="Product rollout / early sales" value={qualitative.berkus.productRollout}   onChange={(v) => updateBerkus("productRollout", v)}         max={100} />
              </div>
            </div>

            {/* Scorecard factors */}
            <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
              <p className="eyebrow mb-3">Scorecard (% vs. average peer — 100 = in line, 150 = +50%)</p>
              <div className="space-y-3">
                <FactorSlider label="Team strength (30%)"          value={qualitative.scorecard.team}         onChange={(v) => updateScorecard("team", v)}         max={200} />
                <FactorSlider label="Market opportunity (25%)"     value={qualitative.scorecard.opportunity}  onChange={(v) => updateScorecard("opportunity", v)}  max={200} />
                <FactorSlider label="Product / technology (15%)"   value={qualitative.scorecard.product}      onChange={(v) => updateScorecard("product", v)}      max={200} />
                <FactorSlider label="Competition (10%)"            value={qualitative.scorecard.competition}  onChange={(v) => updateScorecard("competition", v)}  max={200} />
                <FactorSlider label="Marketing / distribution (10%)" value={qualitative.scorecard.marketing}  onChange={(v) => updateScorecard("marketing", v)}    max={200} />
                <FactorSlider label="Capital needs (5%)"           value={qualitative.scorecard.capitalNeeds} onChange={(v) => updateScorecard("capitalNeeds", v)} max={200} />
                <FactorSlider label="Other (5%)"                   value={qualitative.scorecard.other}        onChange={(v) => updateScorecard("other", v)}        max={200} />
              </div>
            </div>
          </div>
        </ToolSection>
      )}

      {/* ── Fundraising assumptions ───────────────────────────────────────── */}
      <ToolSection title="Fundraising Assumptions">
        <FormGrid cols={3}>
          <InputField id="investment-amount"     label="Investment Amount ($)"  type="number" value={formData.investmentAmount}     onChange={(e) => updateField("investmentAmount", Number(e.target.value))}     hint="New capital raised" />
          <InputField id="investor-equity"       label="Investor Equity (%)"    type="number" value={formData.investorEquity}       onChange={(e) => updateField("investorEquity", Number(e.target.value))}       hint="Equity offered in this round" />
          <InputField id="target-irr"            label="Target IRR"             type="number" value={formData.targetIRR}            onChange={(e) => updateField("targetIRR", Number(e.target.value))}            hint="Decimal — e.g. 0.30 for 30%" />
          <InputField id="exit-years"            label="Exit Years"             type="number" value={formData.exitYears}            onChange={(e) => updateField("exitYears", Number(e.target.value))}            hint="Expected holding period" />
          <InputField id="exit-revenue-multiple" label="Exit Revenue Multiple"  type="number" value={formData.exitRevenueMultiple}  onChange={(e) => updateField("exitRevenueMultiple", Number(e.target.value))}  hint="EV/Revenue at exit" />
          <InputField id="future-rounds"         label="Future Rounds"          type="number" value={formData.futureRounds}         onChange={(e) => updateField("futureRounds", Number(e.target.value))}         hint="Expected future financing rounds" />
        </FormGrid>
      </ToolSection>

      {/* ── Dilution & margins ────────────────────────────────────────────── */}
      <ToolSection title="Dilution & Margin Assumptions">
        <FormGrid cols={3}>
          <InputField id="dilution-per-round" label="Dilution per Round (%)" type="number" value={formData.dilutionPerRound} onChange={(e) => updateField("dilutionPerRound", Number(e.target.value))} hint="Expected dilution per future round" />
          <InputField id="margin-2026" label="Margin 2026" type="number" value={formData.margin2026} onChange={(e) => updateField("margin2026", Number(e.target.value))} />
          <InputField id="margin-2027" label="Margin 2027" type="number" value={formData.margin2027} onChange={(e) => updateField("margin2027", Number(e.target.value))} />
          <InputField id="margin-2028" label="Margin 2028" type="number" value={formData.margin2028} onChange={(e) => updateField("margin2028", Number(e.target.value))} />
          <InputField id="margin-2029" label="Margin 2029" type="number" value={formData.margin2029} onChange={(e) => updateField("margin2029", Number(e.target.value))} />
          <InputField id="margin-2030" label="Margin 2030" type="number" value={formData.margin2030} onChange={(e) => updateField("margin2030", Number(e.target.value))} />
        </FormGrid>
      </ToolSection>

      {/* ── Valuation range (hero) ────────────────────────────────────────── */}
      <ToolSection title="Weighted Valuation Range">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <RangeCard label="Low"  value={valuationLow}       tone="muted" />
          <RangeCard label="Base" value={estimatedValuation} tone="accent" emphasis />
          <RangeCard label="High" value={valuationHigh}      tone="muted" />
        </div>
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-semibold text-foreground">How this range was built:</span>{" "}
          {summary.interpretation.rangeLogic}
        </p>
      </ToolSection>

      {/* ── Methodology breakdown ─────────────────────────────────────────── */}
      <ToolSection title="Methodology Breakdown">
        <div className="space-y-3">
          {summary.methodContributions.map((m) => (
            <MethodDetailCard
              key={m.key}
              contribution={m}
              formData={formData}
              qualitative={qualitative}
              peerBase={summary.peerBase}
            />
          ))}
        </div>
      </ToolSection>

      {/* ── Assumptions ───────────────────────────────────────────────────── */}
      <ToolSection title="Visible Assumptions">
        <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <AssumptionRow label="Stage"              value={formData.stage} />
            <AssumptionRow label="Sector"             value={formData.sector} />
            <AssumptionRow label="Current revenue"    value={fmtM(formData.currentRevenue)} />
            <AssumptionRow label="Growth rate"        value={`${formData.baseGrowthRatePct}% YoY`} />
            <AssumptionRow label="Investment"         value={fmtM(formData.investmentAmount)} />
            <AssumptionRow label="Equity offered"     value={`${formData.investorEquity}%`} />
            <AssumptionRow label="Target IRR"         value={`${(formData.targetIRR * 100).toFixed(0)}%`} />
            <AssumptionRow label="Exit horizon"       value={`${formData.exitYears}y`} />
            <AssumptionRow label="Exit multiple"      value={`${formData.exitRevenueMultiple}x revenue`} />
            <AssumptionRow label="Future rounds"      value={`${formData.futureRounds} (${formData.dilutionPerRound}% dilution each)`} />
            <AssumptionRow label="Peer base (Scorecard)" value={fmtM(summary.peerBase)} />
            <AssumptionRow label="Implied IRR"        value={`${(summary.investor.impliedIRR * 100).toFixed(1)}%`} />
          </div>
        </div>
      </ToolSection>

      {/* ── Founder interpretation ────────────────────────────────────────── */}
      <ToolSection title="Founder Interpretation">
        <InterpretationPanel interpretation={summary.interpretation} positioning={summary.interpretation.positioning} />
      </ToolSection>

      {/* ── Readiness score ───────────────────────────────────────────────── */}
      <ToolSection title="Investor Readiness">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight mb-1">
              {readinessScore}
              <span className="text-muted text-xl">/100</span>
            </p>
            <p className="text-sm text-ink-secondary">Valuation preparation score</p>
          </div>
          <Badge variant={readinessScore >= 70 ? "success" : readinessScore >= 50 ? "warning" : "danger"}>
            {readinessScore >= 70 ? "Ready" : readinessScore >= 50 ? "Improving" : "Needs work"}
          </Badge>
        </div>
        <ProgressBar value={readinessScore} status={readinessScore >= 70 ? "good" : readinessScore >= 50 ? "warning" : "danger"} />
      </ToolSection>

      {/* ── Key insights ──────────────────────────────────────────────────── */}
      {summary.analysis.length > 0 && (
        <ToolSection title="Key Insights">
          <div className="space-y-3">
            {summary.analysis.map((text, index) => (
              <div key={index} className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                <p className="text-sm text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </ToolSection>
      )}

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-[var(--radius-lg)] p-6">
        <p className="text-sm text-muted">
          Sector: {formData.sector} · Stage: {formData.stage} · Primary: {summary.interpretation.primaryMethod}
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

      <FlowContinue isComplete={isComplete} nextHref="/qa" nextLabel="Q&A" />
    </ToolPageLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RangeCard({
  label, value, tone, emphasis,
}: {
  label: string;
  value: number;
  tone: "muted" | "accent";
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] p-4 border ${
        emphasis
          ? "bg-ink text-white border-ink"
          : "bg-soft border-border"
      }`}
    >
      <p className={`eyebrow mb-1 ${emphasis ? "text-white/60" : ""}`}>{label}</p>
      <p className={`text-2xl font-extrabold font-mono tracking-tight ${emphasis ? "text-white" : "text-foreground"}`}>
        {fmtM(value)}
      </p>
      {emphasis && <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">Weighted base</p>}
    </div>
  );
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border/50 last:border-b-0">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FactorSlider({
  label, value, onChange, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ink-secondary">{label}</span>
        <span className="text-xs font-mono font-semibold text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
      />
    </div>
  );
}

function getMethodInputs(
  key: MethodKey,
  formData: ValuationFormData,
  qualitative: QualitativeData,
  peerBase: number,
): { label: string; value: string }[] {
  switch (key) {
    case "vcMethod":
      return [
        { label: "Investment",     value: fmtM(formData.investmentAmount) },
        { label: "Target IRR",     value: `${(formData.targetIRR * 100).toFixed(0)}%` },
        { label: "Exit years",     value: `${formData.exitYears}y` },
        { label: "Exit multiple",  value: `${formData.exitRevenueMultiple}x rev` },
        { label: "Exit revenue",   value: fmtM(formData.currentRevenue * Math.pow(1 + formData.baseGrowthRatePct / 100, formData.exitYears)) },
      ];
    case "revenueMultiple":
      return [
        { label: "Current revenue", value: fmtM(formData.currentRevenue) },
        { label: "Sector",          value: formData.sector },
        { label: "Stage",           value: formData.stage },
      ];
    case "comparables":
      return [
        { label: "Stage",        value: formData.stage },
        { label: "Growth rate",  value: `${formData.baseGrowthRatePct}%` },
      ];
    case "berkus":
      return [
        { label: "Sound idea",              value: `${qualitative.berkus.soundIdea}/100` },
        { label: "Prototype",               value: `${qualitative.berkus.prototype}/100` },
        { label: "Team",                    value: `${qualitative.berkus.qualityTeam}/100` },
        { label: "Strategic relationships", value: `${qualitative.berkus.strategicRelationships}/100` },
        { label: "Product rollout",         value: `${qualitative.berkus.productRollout}/100` },
      ];
    case "scorecard":
      return [
        { label: "Peer base",   value: fmtM(peerBase) },
        { label: "Team",        value: `${qualitative.scorecard.team}%` },
        { label: "Market",      value: `${qualitative.scorecard.opportunity}%` },
        { label: "Product",     value: `${qualitative.scorecard.product}%` },
        { label: "Competition", value: `${qualitative.scorecard.competition}%` },
        { label: "Marketing",   value: `${qualitative.scorecard.marketing}%` },
      ];
  }
}

function MethodDetailCard({
  contribution, formData, qualitative, peerBase,
}: {
  contribution: MethodContribution;
  formData: ValuationFormData;
  qualitative: QualitativeData;
  peerBase: number;
}) {
  const meta = METHOD_META[contribution.key];
  const { result, normWeight, applicable, reasonSkipped } = contribution;
  const weightPct = Math.round(normWeight * 100);
  const inputs = getMethodInputs(contribution.key, formData, qualitative, peerBase);

  return (
    <div
      className={`border rounded-[var(--radius-md)] overflow-hidden transition-colors ${
        applicable ? "border-border bg-card" : "border-border/50 bg-soft/50 opacity-75"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-soft/40 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-bold text-foreground">{meta.title}</h4>
            {applicable ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success/10 text-success">
                Applicable
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/20 text-muted">
                Not applicable
              </span>
            )}
            {applicable && weightPct > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                {weightPct}% of blend
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{meta.tagline}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted uppercase tracking-wider">Valuation</p>
          <p className="text-lg font-mono font-bold text-foreground">
            {applicable ? fmtM(result.valuation) : "—"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Not applicable notice */}
        {!applicable && reasonSkipped && (
          <div className="flex items-start gap-2 text-xs text-muted">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{reasonSkipped}</span>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">What it is</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{meta.description}</p>
        </div>

        {/* When relevant */}
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">When it's most useful</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{meta.whenRelevant}</p>
        </div>

        {/* Inputs */}
        {applicable && inputs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Inputs used</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {inputs.map((inp, i) => (
                <div key={i} className="flex justify-between items-baseline gap-2 text-xs">
                  <span className="text-muted truncate">{inp.label}</span>
                  <span className="font-mono font-semibold text-foreground shrink-0">{inp.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculation reasoning */}
        {applicable && (
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">How the number was reached</p>
            <p className="text-xs text-ink-secondary leading-relaxed font-mono">{result.reasoning}</p>
          </div>
        )}

        {/* Output range */}
        {applicable && (
          <div className="flex gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Low</p>
              <p className="text-sm font-mono font-semibold">{fmtM(result.low)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Base</p>
              <p className="text-sm font-mono font-bold text-accent">{fmtM(result.valuation)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">High</p>
              <p className="text-sm font-mono font-semibold">{fmtM(result.high)}</p>
            </div>
          </div>
        )}

        {/* Limitations */}
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Limitations</p>
          <ul className="space-y-0.5">
            {meta.limitations.map((lim, i) => (
              <li key={i} className="text-xs text-muted leading-relaxed flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 rounded-full bg-muted/60 shrink-0" />
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Source */}
        <p className="text-[10px] text-muted italic">{result.source}</p>
      </div>
    </div>
  );
}

function InterpretationPanel({
  interpretation, positioning,
}: {
  interpretation: {
    positioning: string;
    positioningText: string;
    primaryMethod: string;
    leastReliable: string;
    challenges: string[];
    strengthen: string[];
  };
  positioning: "conservative" | "in-range" | "aggressive" | "unclear";
}) {
  const posConfig = {
    "conservative": { label: "Conservative", cls: "bg-accent/10 text-accent border-accent/30" },
    "in-range":     { label: "In range",      cls: "bg-success/10 text-success border-success/30" },
    "aggressive":   { label: "Aggressive",    cls: "bg-warning/10 text-warning border-warning/30" },
    "unclear":      { label: "Insufficient data", cls: "bg-muted/20 text-muted border-border" },
  }[positioning];

  return (
    <div className="border border-border rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-soft border-b border-border flex items-center gap-3 flex-wrap">
        <TrendingUp className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm font-semibold">Positioning</span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-semibold ${posConfig.cls}`}>
          {posConfig.label}
        </span>
        <p className="text-xs text-ink-secondary w-full sm:w-auto sm:flex-1 leading-snug sm:ml-2 mt-2 sm:mt-0">
          {interpretation.positioningText}
        </p>
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Challenges */}
        <div className="p-5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Investors will challenge
          </p>
          <div className="space-y-2.5">
            {interpretation.challenges.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-ink-secondary leading-snug">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Strengthen */}
        <div className="p-5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-success" />
            How to strengthen the case
          </p>
          <div className="space-y-2.5">
            {interpretation.strengthen.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-ink-secondary leading-snug">
                <span className="mt-0.5 text-muted font-bold shrink-0">→</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Method summary strip */}
      <div className="px-5 py-3 border-t border-border bg-soft/40 flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="text-xs">
          <span className="text-muted">Primary method:</span>{" "}
          <span className="font-semibold text-foreground">{interpretation.primaryMethod}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted">Least reliable here:</span>{" "}
          <span className="font-semibold text-foreground">{interpretation.leastReliable}</span>
        </div>
      </div>
    </div>
  );
}
