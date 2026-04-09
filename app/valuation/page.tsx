"use client";

import { useState, useMemo, useCallback } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Save, RotateCcw, Check, Calculator, ExternalLink, Info } from "lucide-react";
import { saveValuation } from "@/lib/db-valuation";
import {
  calculateFullValuation,
  type ValuationSummary,
} from "@/lib/valuation-methods";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = ["SaaS", "Fintech", "AgriTech", "Health Tech", "Consumer Tech", "Other"];
const STAGES = ["Seed", "Series A", "Series B", "Series C"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  startupName: string;
  sector: string;
  stage: string;
  currentRevenue: number;
  baseGrowthRate: number; // %
  margin2026: number;
  margin2027: number;
  margin2028: number;
  margin2029: number;
  margin2030: number;
  investmentAmount: number;
  investorEquity: number; // %
  targetIRR: number; // % e.g. 30
  exitYears: number;
  exitRevenueMultiple: number;
  dilutionPerRound: number; // % per future round
  futureRounds: number;
}

const DEFAULT: FormState = {
  startupName: "",
  sector: "SaaS",
  stage: "Series A",
  currentRevenue: 500_000,
  baseGrowthRate: 60,
  margin2026: -30,
  margin2027: -15,
  margin2028: 0,
  margin2029: 10,
  margin2030: 20,
  investmentAmount: 2_000_000,
  investorEquity: 20,
  targetIRR: 30,
  exitYears: 5,
  exitRevenueMultiple: 6,
  dilutionPerRound: 15,
  futureRounds: 2,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(decimals)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(decimals)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
      {hint && <p className="text-[11px] text-muted mb-1.5 leading-tight">{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-xs text-muted pointer-events-none">{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className={`w-full py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background ${prefix ? "pl-7 pr-3" : suffix ? "pl-3 pr-8" : "px-3"}`}
      />
      {suffix && (
        <span className="absolute right-3 text-xs text-muted pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] p-4 border ${
        accent
          ? "bg-accent/10 border-accent/30"
          : "bg-soft border-border"
      }`}
    >
      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-extrabold font-mono tracking-tight ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-4">
      <p className="text-xs font-bold text-muted uppercase tracking-widest whitespace-nowrap">
        {title}
      </p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [calculated, setCalculated] = useState(false);
  const [result, setResult] = useState<ValuationSummary | null>(null);
  const [saved, setSaved] = useState(false);

  const update = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setCalculated(false);
    setSaved(false);
  }, []);

  const handleCalculate = useCallback(() => {
    const summary = calculateFullValuation({
      currentRevenue: form.currentRevenue,
      sector: form.sector,
      stage: form.stage,
      baseGrowthRate: form.baseGrowthRate / 100,
      projectionInputs: {
        currentRevenue: form.currentRevenue,
        baseRevenueGrowth: form.baseGrowthRate,
        margin2026: form.margin2026 / 100,
        margin2027: form.margin2027 / 100,
        margin2028: form.margin2028 / 100,
        margin2029: form.margin2029 / 100,
        margin2030: form.margin2030 / 100,
      },
      investmentAmount: form.investmentAmount,
      investorEquity: form.investorEquity,
      targetIRR: form.targetIRR / 100,
      exitYears: form.exitYears,
      exitRevenueMultiple: form.exitRevenueMultiple,
      dilutionPerRound: form.dilutionPerRound,
      futureRounds: form.futureRounds,
    });
    setResult(summary);
    setCalculated(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    try {
      await saveValuation({
        name: form.startupName || `valuation_${new Date().toISOString()}`,
        current_revenue: form.currentRevenue,
        growth_rate: form.baseGrowthRate,
        sector: form.sector,
        stage: form.stage,
        investment_amount: form.investmentAmount,
        investor_equity: form.investorEquity,
        target_irr: form.targetIRR,
        exit_years: form.exitYears,
        exit_revenue_multiple: form.exitRevenueMultiple,
        revenue_multiple: result.averageMultiple,
        estimated_valuation: result.blended.base,
        valuation_low: result.blended.low,
        valuation_high: result.blended.high,
        vc_method_valuation: result.vcMethod.valuation,
        comparables_valuation: result.comparables.valuation,
        blended_low: result.blended.low,
        blended_base: result.blended.base,
        blended_high: result.blended.high,
        pre_money: result.investor.preMoney,
        post_money: result.investor.postMoney,
        investor_equity_at_exit: result.investor.investorEquityAtExit,
        exit_proceeds: result.investor.exitProceeds,
        cash_on_cash: result.investor.cashOnCash,
        implied_irr: result.investor.impliedIRR,
        projection_quality_score: result.projectionQuality.qualityScore,
        growth_profile: result.projectionQuality.growthProfile,
        recommended_conservative: result.recommendedRange.conservative,
        recommended_base: result.recommendedRange.base,
        recommended_stretch: result.recommendedRange.stretch,
        fundraising_min: result.recommendedRange.fundraisingMin,
        fundraising_max: result.recommendedRange.fundraisingMax,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("[v0] Error saving valuation:", err);
    }
  }, [form, result]);

  const handleReset = useCallback(() => {
    setForm(DEFAULT);
    setResult(null);
    setCalculated(false);
    setSaved(false);
  }, []);

  // Live pre/post money preview (always visible)
  const livePostMoney = useMemo(
    () => form.investmentAmount / (form.investorEquity / 100),
    [form.investmentAmount, form.investorEquity]
  );
  const livePreMoney = livePostMoney - form.investmentAmount;

  return (
    <ToolPageLayout
      kicker="Valuation Engine"
      title="Investor-grade startup valuation."
      description="Multi-method valuation engine combining VC Method, Revenue Multiple, and Stage Comparables. Includes 5-year projection analysis, investor return modeling, and recommended fundraising ranges based on benchmark data."
    >
      <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
        {/* ── Input Panel ── */}
        <div className="space-y-0">
          {/* Company Profile */}
          <ToolSection title="Company Profile">
            <div className="space-y-3">
              <InputRow label="Startup Name (optional)">
                <input
                  type="text"
                  value={form.startupName}
                  onChange={(e) => update("startupName", e.target.value)}
                  placeholder="e.g. Acme SaaS"
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </InputRow>
              <InputRow label="Current Annual Revenue (ARR)">
                <NumberInput
                  value={form.currentRevenue}
                  onChange={(v) => update("currentRevenue", v)}
                  min={0}
                  prefix="$"
                />
              </InputRow>
              <div className="grid grid-cols-2 gap-2">
                <InputRow label="Sector">
                  <select
                    value={form.sector}
                    onChange={(e) => update("sector", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                  >
                    {SECTORS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </InputRow>
                <InputRow label="Stage">
                  <select
                    value={form.stage}
                    onChange={(e) => update("stage", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                  >
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </InputRow>
              </div>
            </div>
          </ToolSection>

          {/* Revenue Projections */}
          <ToolSection title="5-Year Revenue Projections">
            <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-3 mb-4 text-xs text-ink-secondary leading-relaxed">
              These projections <strong className="text-ink">directly drive your valuation</strong>.
              They feed into exit revenue calculations, growth profile analysis, and scenario modeling.
              Unrealistic assumptions will be flagged.
            </div>
            <div className="space-y-3">
              <InputRow
                label="Base Annual Growth Rate"
                hint="Applied to all 3 scenarios (pessimistic = 65%, base = 100%, optimistic = 135%)"
              >
                <NumberInput
                  value={form.baseGrowthRate}
                  onChange={(v) => update("baseGrowthRate", v)}
                  min={0}
                  max={500}
                  suffix="%"
                />
              </InputRow>
              <InputRow
                label="Exit Horizon"
                hint="Years until exit / liquidity event. Typical VC hold period: 5-7 years."
              >
                <NumberInput
                  value={form.exitYears}
                  onChange={(v) => update("exitYears", v)}
                  min={1}
                  max={10}
                  suffix="yr"
                />
              </InputRow>
              {form.exitYears <= 5 && (
                <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-2.5 text-[11px] text-ink-secondary">
                  <strong className="text-ink">Exit revenue</strong> will be calculated from Year {form.exitYears} projections
                  below ({fmt(form.currentRevenue * Math.pow(1 + form.baseGrowthRate / 100, form.exitYears))} at current growth rate).
                </div>
              )}
              {form.exitYears > 5 && (
                <div className="bg-warning/5 border border-warning/20 rounded-[var(--radius-md)] p-2.5 text-[11px] text-ink-secondary">
                  <strong className="text-warning">Note:</strong> Exit in Year {form.exitYears} extends beyond the 5-year projection window.
                  Exit revenue will be extrapolated using your base growth rate.
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted mb-2">
                  EBITDA Margin by Year (base scenario)
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { label: "Y1", field: "margin2026" as const },
                      { label: "Y2", field: "margin2027" as const },
                      { label: "Y3", field: "margin2028" as const },
                      { label: "Y4", field: "margin2029" as const },
                      { label: "Y5", field: "margin2030" as const },
                    ] as const
                  ).map(({ label, field }) => (
                    <div key={field}>
                      <p className="text-[10px] text-muted mb-1 text-center">{label}</p>
                      <input
                        type="number"
                        value={form[field]}
                        onChange={(e) => update(field, Number(e.target.value))}
                        className="w-full px-1.5 py-1.5 border border-border rounded text-xs bg-background text-center"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1.5">Values in %. Negative = pre-profit.</p>
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 mt-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Projection Quality Tips
                </p>
                <ul className="space-y-1 text-[11px] text-ink-secondary">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Growth typically decelerates as revenue scales — investors expect this</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Margins should improve gradually as you achieve economies of scale</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Support high-growth claims with cohort retention and unit economics data</span>
                  </li>
                </ul>
              </div>
            </div>
          </ToolSection>

          {/* Investor Terms */}
          <ToolSection title="Investor Terms">
            <div className="space-y-3">
              <InputRow
                label="Investment Amount"
                hint="Amount the investor is putting in"
              >
                <NumberInput
                  value={form.investmentAmount}
                  onChange={(v) => update("investmentAmount", v)}
                  min={0}
                  prefix="$"
                />
              </InputRow>
              <InputRow
                label="Investor Ownership at Entry"
                hint="Equity % offered in exchange for the investment"
              >
                <NumberInput
                  value={form.investorEquity}
                  onChange={(v) => update("investorEquity", v)}
                  min={1}
                  max={99}
                  suffix="%"
                />
              </InputRow>
              <InputRow
                label="Investor Target IRR"
                hint="Typical VC hurdle rate is 25–35%"
              >
                <NumberInput
                  value={form.targetIRR}
                  onChange={(v) => update("targetIRR", v)}
                  min={10}
                  max={100}
                  suffix="%"
                />
              </InputRow>

              <SectionDivider title="Exit Assumptions" />

              <InputRow
                label="Exit EV/Revenue Multiple"
                hint="Sector median at exit. SaaS: 5–8x, Fintech: 4–7x, AgriTech: 3–5x"
              >
                <NumberInput
                  value={form.exitRevenueMultiple}
                  onChange={(v) => update("exitRevenueMultiple", v)}
                  min={1}
                  max={30}
                  step={0.5}
                  suffix="x"
                />
              </InputRow>

              <SectionDivider title="Dilution Model" />

              <div className="grid grid-cols-2 gap-2">
                <InputRow label="Dilution / Round" hint="Typical: 10–20%">
                  <NumberInput
                    value={form.dilutionPerRound}
                    onChange={(v) => update("dilutionPerRound", v)}
                    min={0}
                    max={50}
                    suffix="%"
                  />
                </InputRow>
                <InputRow label="Future Rounds" hint="Expected before exit">
                  <NumberInput
                    value={form.futureRounds}
                    onChange={(v) => update("futureRounds", v)}
                    min={0}
                    max={5}
                  />
                </InputRow>
              </div>

              {/* Live pre/post money preview */}
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Pre-Money</p>
                  <p className="text-sm font-extrabold font-mono">{fmt(livePreMoney)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-0.5">Post-Money</p>
                  <p className="text-sm font-extrabold font-mono">{fmt(livePostMoney)}</p>
                </div>
              </div>
            </div>
          </ToolSection>

          {/* Action buttons */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-4 space-y-2">
            <Button onClick={handleCalculate} className="w-full">
              <Calculator className="w-4 h-4" />
              Calculate Valuation
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSave}
                variant="secondary"
                disabled={!calculated || !result}
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Saved" : "Save"}
              </Button>
              <Button onClick={handleReset} variant="secondary">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
            {!calculated && (
              <p className="text-[11px] text-muted text-center">
                Press Calculate to generate results
              </p>
            )}
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="space-y-0">
          {!result ? (
            <ToolSection>
              <div className="text-center py-16">
                <Calculator className="w-10 h-10 text-muted mx-auto mb-4" />
                <p className="text-base font-semibold text-ink mb-2">
                  Fill in your inputs and press Calculate
                </p>
                <p className="text-sm text-ink-secondary max-w-md mx-auto">
                  Get investor-grade valuation analysis including: recommended fundraising range,
                  three valuation methods, 5-year projection quality assessment, investor return
                  modeling, and scenario analysis.
                </p>
              </div>
            </ToolSection>
          ) : (
            <>
              {/* ── Methodology Note ── */}
              <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-lg)] p-4 mb-4 text-xs text-ink-secondary leading-relaxed">
                <strong className="text-ink">Methodology Note:</strong> This valuation uses three
                industry-standard methods (VC Method, Revenue Multiple, Stage Comparables) and is{" "}
                <strong>scenario-based and benchmark-informed</strong>, not a certified appraisal.
                Outputs are intended for fundraising preparation and reflect reasonable negotiation
                ranges, subject to market conditions.
              </div>

              {/* ── Recommended Fundraising Range ── */}
              <ToolSection title="Recommended Fundraising Range">
                <p className="text-xs text-muted mb-4">
                  Synthesis of all methods, projection quality, and investor return profile.
                  This is your defensible negotiation range.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard
                    label="Conservative"
                    value={fmt(result.recommendedRange.conservative)}
                    sub="Floor for negotiations"
                  />
                  <MetricCard
                    label="Recommended"
                    value={fmt(result.recommendedRange.base)}
                    sub="Target pre-money"
                    accent
                  />
                  <MetricCard
                    label="Stretch"
                    value={fmt(result.recommendedRange.stretch)}
                    sub="Ceiling with strong case"
                  />
                </div>
                <div className="bg-accent/10 border border-accent/30 rounded-[var(--radius-md)] p-4">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
                    Fundraising Strategy
                  </p>
                  <p className="text-sm text-ink leading-relaxed mb-3">
                    {result.recommendedRange.rationale}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted">Defensible range:</span>
                    <span className="font-bold font-mono text-accent">
                      {fmt(result.recommendedRange.fundraisingMin)} – {fmt(result.recommendedRange.fundraisingMax)}
                    </span>
                  </div>
                </div>
              </ToolSection>

              {/* ── Valuation Summary ── */}
              <ToolSection title="Valuation Summary (All Methods)">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Conservative" value={fmt(result.blended.low)} sub="Min across methods" />
                  <MetricCard
                    label="Base Case"
                    value={fmt(result.blended.base)}
                    sub="3-method average"
                    accent
                  />
                  <MetricCard label="Optimistic" value={fmt(result.blended.high)} sub="Max across methods" />
                </div>
                <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 text-sm leading-relaxed">
                  <span className="font-semibold">
                    {form.stage} {form.sector}
                  </span>{" "}
                  — base pre-money valuation of{" "}
                  <span className="font-bold font-mono">{fmt(result.blended.base)}</span> at an average{" "}
                  <span className="font-bold">{result.averageMultiple.toFixed(1)}x</span> revenue
                  multiple. Investor offering{" "}
                  <span className="font-bold">{form.investorEquity}%</span> for{" "}
                  <span className="font-bold">{fmt(form.investmentAmount)}</span> implies a post-money
                  of{" "}
                  <span className="font-bold">{fmt(result.investor.postMoney)}</span>.
                </div>
              </ToolSection>

              {/* ── Multi-Method Comparison ── */}
              <ToolSection title="Multi-Method Comparison">
                <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-3 mb-4 text-xs text-ink-secondary leading-relaxed">
                  <strong className="text-ink">Three Independent Methods:</strong> Each approach calculates
                  valuation using different assumptions and benchmarks. <strong>VC Method</strong> — investor
                  return-driven. <strong>Revenue Multiple</strong> — sector norms. <strong>Comparables</strong> — 
                  actual stage-specific rounds. Divergence reveals where your story needs strengthening.
                </div>
                
                {/* METHOD 1: VC Method */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-ink">VC Method (Return-Driven)</h4>
                  </div>
                  <div className="bg-soft border-2 border-accent/30 rounded-[var(--radius-md)] p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-xs text-muted">{result.vcMethod.reasoning}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold font-mono text-accent">{fmt(result.vcMethod.valuation)}</p>
                        {result.vcMethod.multiple !== undefined && (
                          <p className="text-[11px] text-muted">{result.vcMethod.multiple.toFixed(1)}x revenue</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted mb-2">
                      <span className="font-mono">{fmt(result.vcMethod.low)}</span>
                      <div className="flex-1">
                        <ProgressBar
                          value={result.vcMethod.valuation - result.vcMethod.low}
                          max={result.vcMethod.high - result.vcMethod.low}
                          status="neutral"
                          size="sm"
                        />
                      </div>
                      <span className="font-mono">{fmt(result.vcMethod.high)}</span>
                    </div>
                    <p className="text-[10px] text-muted italic">Source: {result.vcMethod.source}</p>
                  </div>
                </div>

                {/* METHOD 2: Revenue Multiple */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-ink">Revenue Multiple (Sector Norms)</h4>
                  </div>
                  <div className="bg-soft border-2 border-border rounded-[var(--radius-md)] p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-xs text-muted">{result.revenueMultiple.reasoning}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold font-mono">{fmt(result.revenueMultiple.valuation)}</p>
                        {result.revenueMultiple.multiple !== undefined && (
                          <p className="text-[11px] text-muted">{result.revenueMultiple.multiple.toFixed(1)}x revenue</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted mb-2">
                      <span className="font-mono">{fmt(result.revenueMultiple.low)}</span>
                      <div className="flex-1">
                        <ProgressBar
                          value={result.revenueMultiple.valuation - result.revenueMultiple.low}
                          max={result.revenueMultiple.high - result.revenueMultiple.low}
                          status="neutral"
                          size="sm"
                        />
                      </div>
                      <span className="font-mono">{fmt(result.revenueMultiple.high)}</span>
                    </div>
                    <p className="text-[10px] text-muted italic">Source: {result.revenueMultiple.source}</p>
                  </div>
                </div>

                {/* METHOD 3: Comparables */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-ink">Stage Comparables (Market Reality)</h4>
                  </div>
                  <div className="bg-soft border-2 border-border rounded-[var(--radius-md)] p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-xs text-muted">{result.comparables.reasoning}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold font-mono">{fmt(result.comparables.valuation)}</p>
                        {result.comparables.multiple !== undefined && (
                          <p className="text-[11px] text-muted">{result.comparables.multiple.toFixed(1)}x revenue</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted mb-2">
                      <span className="font-mono">{fmt(result.comparables.low)}</span>
                      <div className="flex-1">
                        <ProgressBar
                          value={result.comparables.valuation - result.comparables.low}
                          max={result.comparables.high - result.comparables.low}
                          status="neutral"
                          size="sm"
                        />
                      </div>
                      <span className="font-mono">{fmt(result.comparables.high)}</span>
                    </div>
                    <p className="text-[10px] text-muted italic">Source: {result.comparables.source}</p>
                  </div>
                </div>
              </ToolSection>

              {/* ── 5-Year Projections ── */}
              <ToolSection title="5-Year Revenue Projections">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className="text-xs text-muted">
                    Base growth of {form.baseGrowthRate}%/yr. Optimistic = 135%, Pessimistic = 65% of
                    base rate.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Quality
                    </span>
                    <span
                      className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold ${
                        result.projectionQuality.qualityScore >= 80
                          ? "bg-success/10 text-success"
                          : result.projectionQuality.qualityScore >= 60
                          ? "bg-warning/10 text-warning"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {result.projectionQuality.qualityScore}/100
                    </span>
                  </div>
                </div>
                {result.projectionQuality.warnings.length > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-[var(--radius-md)] p-3 mb-4">
                    <p className="text-[10px] font-bold text-warning uppercase tracking-wider mb-2">
                      Projection Warnings
                    </p>
                    <ul className="space-y-1.5">
                      {result.projectionQuality.warnings.map((warning, i) => (
                        <li key={i} className="text-xs text-ink-secondary leading-relaxed flex gap-2">
                          <span className="text-warning mt-0.5">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Growth Profile:</span>
                    <span className="font-bold text-ink">{result.projectionQuality.growthProfile}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-muted">Year</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted">Pessimistic</th>
                        <th className="text-right py-2 px-2 font-semibold text-accent">Base</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted">Optimistic</th>
                        <th className="text-right py-2 pl-2 font-semibold text-muted">EBITDA %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.projections.map((row) => (
                        <tr key={row.year} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 font-mono font-bold">{row.year}</td>
                          <td className="text-right py-2 px-2 font-mono text-muted">
                            {fmt(row.revenuePess)}
                          </td>
                          <td className="text-right py-2 px-2 font-mono font-bold text-accent">
                            {fmt(row.revenueBase)}
                          </td>
                          <td className="text-right py-2 px-2 font-mono text-muted">
                            {fmt(row.revenueOpt)}
                          </td>
                          <td className="text-right py-2 pl-2 font-mono text-muted">
                            {(row.margin * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ToolSection>

              {/* ── Investor View ── */}
              <ToolSection title="Investor View">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <MetricCard
                    label="Equity at Entry"
                    value={`${result.investor.investorEquityEntry.toFixed(1)}%`}
                    sub="Investor ownership"
                  />
                  <MetricCard
                    label="Equity at Exit"
                    value={`${result.investor.investorEquityAtExit.toFixed(1)}%`}
                    sub={`After ${form.futureRounds} round dilution`}
                  />
                  <MetricCard
                    label="Dilution"
                    value={`−${result.investor.dilutionPercent.toFixed(1)}%`}
                    sub={`${form.futureRounds}× ${form.dilutionPerRound}%/round`}
                  />
                  <MetricCard
                    label="Exit Proceeds"
                    value={fmt(result.investor.exitProceeds)}
                    sub={`${result.investor.investorEquityAtExit.toFixed(1)}% of exit EV`}
                  />
                  <MetricCard
                    label="Cash-on-Cash"
                    value={`${result.investor.cashOnCash.toFixed(1)}x`}
                    sub="Exit / Entry"
                    accent={result.investor.cashOnCash >= 3}
                  />
                  <MetricCard
                    label="Implied IRR"
                    value={pct(result.investor.impliedIRR, 0)}
                    sub={
                      result.investor.impliedIRR >= 0.3
                        ? "Above VC hurdle (30%)"
                        : "Below VC hurdle (30%)"
                    }
                    accent={result.investor.impliedIRR >= 0.3}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>
                      Exit EV based on {fmt(form.currentRevenue * Math.pow(1 + form.baseGrowthRate / 100, form.exitYears))} exit revenue × {form.exitRevenueMultiple}x multiple
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>
                      Exit proceeds shown are pre-tax. Actual investor returns may be subject to
                      capital gains tax (typically 15-30% depending on jurisdiction and holding period).
                    </span>
                  </div>
                </div>
              </ToolSection>

              {/* ── Scenario Comparison ── */}
              <ToolSection title="Scenario Comparison">
                <p className="text-xs text-muted mb-4">
                  Scenarios adjust your base growth rate to model realistic downside and upside.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-muted">Scenario</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted">Growth</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted">Exit Revenue</th>
                        <th className="text-right py-2 px-2 font-semibold text-muted">Exit EV</th>
                        <th className="text-right py-2 pl-2 font-semibold text-muted">VC Valuation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarios.map((s) => (
                        <tr
                          key={s.name}
                          className={`border-b border-border/50 last:border-0 ${
                            s.name === "Base" ? "font-bold" : ""
                          }`}
                        >
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.name === "Pessimistic"
                                  ? "bg-danger/10 text-danger"
                                  : s.name === "Base"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-success/10 text-success"
                              }`}
                            >
                              {s.name}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2 font-mono">
                            {(form.baseGrowthRate * s.growthMultiplier).toFixed(0)}%
                          </td>
                          <td className="text-right py-2 px-2 font-mono">{fmt(s.exitRevenue)}</td>
                          <td className="text-right py-2 px-2 font-mono">{fmt(s.exitValuation)}</td>
                          <td className="text-right py-2 pl-2 font-mono">{fmt(s.vcMethodValuation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ToolSection>

              {/* ── Founder Analysis ── */}
              <ToolSection title="Founder Analysis">
                <p className="text-xs text-muted mb-4">
                  Based on your inputs and benchmark data — not generic advice.
                </p>
                <div className="space-y-3">
                  {result.analysis.map((insight, i) => (
                    <div
                      key={i}
                      className="flex gap-3 p-4 bg-soft border border-border rounded-[var(--radius-md)]"
                    >
                      <span className="text-xs font-bold text-muted mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm text-ink leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </ToolSection>

              {/* ── Sources & Methodology ── */}
              <ToolSection title="Sources & Methodology">
                <div className="space-y-3 text-xs text-ink-secondary">
                  <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-3">
                    <p className="font-semibold text-ink mb-2">What this tool provides:</p>
                    <p className="leading-relaxed">
                      A <strong>multi-method, scenario-based valuation range</strong> using industry
                      benchmarks and investor return mechanics. Designed for fundraising preparation,
                      not certified appraisal. Results reflect reasonable negotiation ranges subject to
                      market conditions, deal structure, and investor-specific criteria.
                    </p>
                  </div>
                  <div className="bg-warning/5 border border-warning/20 rounded-[var(--radius-md)] p-3">
                    <p className="font-semibold text-warning mb-2">Limitations:</p>
                    <ul className="space-y-1 leading-relaxed">
                      <li className="flex gap-2">
                        <span>•</span>
                        <span>
                          Benchmarks reflect 2022–2024 data and may not capture current market shifts
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <span>
                          Stage multiples have high variance — validate with recent comparables in your
                          sector and geography
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <span>
                          Final valuations depend on negotiation, investor mandate, and qualitative factors
                          not captured here
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-ink text-xs uppercase tracking-wide">
                      Benchmark References
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        <span>
                          <strong>Damodaran (NYU Stern)</strong> — EV/Revenue multiples by sector,
                          updated annually.{" "}
                          <a
                            href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html#multiples"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline underline-offset-2"
                          >
                            pages.stern.nyu.edu
                          </a>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        <span>
                          <strong>Eval.tech</strong> — Startup transaction multiples database (ARR,
                          SaaS, growth-stage).{" "}
                          <a
                            href="https://www.eval.tech/free-valuation-multiples/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline underline-offset-2"
                          >
                            eval.tech
                          </a>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        <span>
                          <strong>VC Method</strong> — Sahlman (1987), Harvard Business School. Used
                          by institutional investors to set pre-money from exit and required return.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        <span>
                          <strong>Stage comparables</strong> — Magnitt 2024 MENA Venture Report,
                          Crunchbase, Pitchbook public disclosures.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-border pt-3 text-[11px] text-muted">
                    Multiples reflect 2022–2024 transaction data. Early-stage multiples are subject to
                    significant market variance. Always validate against live comparable rounds in your
                    sector and geography.
                  </div>
                </div>
              </ToolSection>
            </>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
