"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Save, RotateCcw, Check, Calculator, ExternalLink, Info } from "lucide-react";
import { saveValuation } from "@/lib/db-valuation";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import {
  calculateFullValuation,
  type ValuationSummary,
} from "@/lib/valuation-methods";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { computeValuationScore, saveReadinessSnapshot } from "@/lib/local-readiness";

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
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  // Restore saved form state on mount
  useEffect(() => {
    setCompletedSteps(getCompletedSteps());
    try {
      const raw = localStorage.getItem("vcready_valuation_inputs");
      if (raw) {
        const savedForm = JSON.parse(raw) as FormState;
        setForm(savedForm);
      }
    } catch { /* ignore */ }
    // DB restore
    getToolFromDB("valuation").then((db) => {
      if (!db?.inputs) return;
      setForm(db.inputs as unknown as FormState);
    });
  }, []);

  useEffect(() => {
    if (calculated && result) {
      markStepComplete("valuation");
      setCompletedSteps(getCompletedSteps());
    }
  }, [calculated, result]);

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
      });
    } catch (err) {
      console.error("[v0] Error saving valuation:", err);
    }
    // Persist score to localStorage for local readiness engine
    const score = computeValuationScore(
      result.blended.base,
      form.baseGrowthRate,
      !!(form.sector && form.stage)
    );
    localStorage.setItem("vcready_valuation", JSON.stringify({
      score,
      estimated_valuation: result.blended.base,
      growth_rate: form.baseGrowthRate,
      sector: form.sector,
      stage: form.stage,
    }));
    // Persist full form inputs so navigating back restores exact state
    localStorage.setItem("vcready_valuation_inputs", JSON.stringify(form));
    saveReadinessSnapshot();
    saveToolToDB("valuation", score, form as unknown as Record<string, unknown>).catch(console.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
      description="Three complementary methods — VC Method, Revenue Multiple, and Stage Comparables — with real investor mechanics, scenario modelling, and founder analysis."
    >
      <FlowProgress currentStep="valuation" completedSteps={completedSteps} />
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
                hint="Years until exit / liquidity event"
              >
                <NumberInput
                  value={form.exitYears}
                  onChange={(v) => update("exitYears", v)}
                  min={1}
                  max={10}
                  suffix="yr"
                />
              </InputRow>
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
                <p className="text-sm text-ink-secondary max-w-sm mx-auto">
                  Three valuation methods, investor mechanics, 5-year projections,
                  and scenario analysis will appear here.
                </p>
              </div>
            </ToolSection>
          ) : (
            <>
              {/* ── Valuation Summary ── */}
              <ToolSection title="Valuation Summary">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <MetricCard label="Conservative" value={fmt(result.blended.low)} sub="Floor estimate" />
                  <MetricCard
                    label="Base Case"
                    value={fmt(result.blended.base)}
                    sub="3-method average"
                    accent
                  />
                  <MetricCard label="Optimistic" value={fmt(result.blended.high)} sub="Ceiling estimate" />
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
                <p className="text-xs text-muted mb-4">
                  Each method applies independently. Divergence between them reveals where your
                  valuation story is strong or needs work.
                </p>
                <div className="space-y-3">
                  {[result.vcMethod, result.revenueMultiple, result.comparables].map((m) => (
                    <div key={m.method} className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="text-sm font-bold">{m.method}</p>
                          <p className="text-[11px] text-muted mt-0.5">{m.reasoning}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-extrabold font-mono">{fmt(m.valuation)}</p>
                          {m.multiple !== undefined && (
                            <p className="text-[11px] text-muted">{m.multiple.toFixed(1)}x revenue</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        <span className="font-mono">{fmt(m.low)}</span>
                        <div className="flex-1">
                          <ProgressBar
                            value={m.valuation - m.low}
                            max={m.high - m.low}
                            status="neutral"
                            size="sm"
                          />
                        </div>
                        <span className="font-mono">{fmt(m.high)}</span>
                      </div>
                      <p className="text-[10px] text-muted mt-2 italic">Source: {m.source}</p>
                    </div>
                  ))}
                </div>
              </ToolSection>

              {/* ── 5-Year Projections ── */}
              <ToolSection title="5-Year Revenue Projections">
                <p className="text-xs text-muted mb-4">
                  Base growth of {form.baseGrowthRate}%/yr. Optimistic = 135%, Pessimistic = 65% of
                  base rate.
                </p>
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
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>
                    Exit EV based on {fmt(form.currentRevenue * Math.pow(1 + form.baseGrowthRate / 100, form.exitYears))} exit revenue × {form.exitRevenueMultiple}x multiple
                  </span>
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
                  <p className="leading-relaxed">
                    This valuation is{" "}
                    <strong>benchmark-informed, scenario-based, and intended for fundraising preparation only</strong>.
                    It is not financial advice and does not represent a certified appraisal.
                  </p>
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
          <FlowContinue isComplete={calculated && !!result} nextHref="/qa" nextLabel="Q&A" />
        </div>
      </div>
    </ToolPageLayout>
  );
}
