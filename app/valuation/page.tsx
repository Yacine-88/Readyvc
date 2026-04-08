"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { RotateCcw, Save, Check } from "lucide-react";
import { saveValuation } from "@/lib/db-valuation";
import { calculateValuationSummary, ProjectionInputs } from "@/lib/valuation-methods";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";

const SECTORS = ["SaaS", "Fintech", "AgriTech", "Other"];
const STAGES = ["Seed", "Series A", "Series B", "Series C"];

interface FormData {
  startupName: string;
  sector: string;
  stage: string;
  currentRevenue: number;
  baseGrowthRate: number;
  margin2026: number;
  margin2027: number;
  margin2028: number;
  margin2029: number;
  margin2030: number;
  investorEquity: number;
  investmentAmount: number;
  targetReturn: number;
}

const defaultFormData: FormData = {
  startupName: "",
  sector: "SaaS",
  stage: "Series A",
  currentRevenue: 100000,
  baseGrowthRate: 50,
  margin2026: -20,
  margin2027: -10,
  margin2028: 0,
  margin2029: 15,
  margin2030: 25,
  investorEquity: 20,
  investmentAmount: 1000000,
  targetReturn: 10,
};

export default function ValuationPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saved, setSaved] = useState(false);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setSaved(false);
    },
    []
  );

  const handleReset = useCallback(() => {
    setFormData(defaultFormData);
    setSaved(false);
  }, []);

  // Comprehensive valuation summary using multiple methods
  const valuationSummary = useMemo(() => {
    const projections: ProjectionInputs = {
      currentRevenue: formData.currentRevenue,
      baseRevenueGrowth: formData.baseGrowthRate,
      margin2026: formData.margin2026 / 100,
      margin2027: formData.margin2027 / 100,
      margin2028: formData.margin2028 / 100,
      margin2029: formData.margin2029 / 100,
      margin2030: formData.margin2030 / 100,
    };

    return calculateValuationSummary(
      formData.currentRevenue,
      formData.sector,
      formData.stage,
      formData.baseGrowthRate / 100,
      projections
    );
  }, [formData]);

  const handleSave = useCallback(async () => {
    try {
      await saveValuation({
        name: formData.startupName || `valuation_${new Date().toISOString()}`,
        current_revenue: formData.currentRevenue,
        growth_rate: formData.baseGrowthRate,
        revenue_multiple: valuationSummary.averageMultiple,
        estimated_valuation: valuationSummary.median,
        valuation_low: valuationSummary.range.low,
        valuation_high: valuationSummary.range.high,
        stage: formData.stage,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[v0] Error saving valuation:", error);
    }
  }, [formData, valuationSummary]);

  const postMoneyValuation = formData.investmentAmount / (formData.investorEquity / 100);
  const preMoneyValuation = postMoneyValuation - formData.investmentAmount;
  const pricePerShare = postMoneyValuation / 1000000; // Assuming 1M shares post-money for demo

  return (
    <ToolPageLayout
      kicker="Valuation Engine"
      title="Professional startup valuation."
      description="Multiple industry-standard methods to benchmark your valuation against market comparables and investor expectations."
    >
      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Company Profile */}
          <ToolSection title="Company Profile">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Startup Name
                </label>
                <input
                  type="text"
                  value={formData.startupName}
                  onChange={(e) => updateField("startupName", e.target.value)}
                  placeholder="e.g. TechCorp"
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Current Annual Revenue
                </label>
                <input
                  type="number"
                  value={formData.currentRevenue}
                  onChange={(e) => updateField("currentRevenue", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-2">
                    Sector
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => updateField("sector", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-2">
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => updateField("stage", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </ToolSection>

          {/* 5-Year Projections */}
          <ToolSection title="5-Year Projections">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Base Annual Growth Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.baseGrowthRate}
                  onChange={(e) => updateField("baseGrowthRate", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <p className="text-xs text-muted">Expected Margins by Year</p>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { year: 2026, field: "margin2026" as const },
                  { year: 2027, field: "margin2027" as const },
                  { year: 2028, field: "margin2028" as const },
                  { year: 2029, field: "margin2029" as const },
                  { year: 2030, field: "margin2030" as const },
                ].map(({ year, field }) => (
                  <div key={year}>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      {year}
                    </label>
                    <input
                      type="number"
                      value={formData[field]}
                      onChange={(e) => updateField(field, Number(e.target.value))}
                      className="w-full px-2 py-1 border border-border rounded text-xs bg-background"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ToolSection>

          {/* Investor Terms */}
          <ToolSection title="Investor Equity Terms">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Investment Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.investmentAmount}
                  onChange={(e) => updateField("investmentAmount", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Investor Ownership (%)
                </label>
                <input
                  type="number"
                  value={formData.investorEquity}
                  onChange={(e) => updateField("investorEquity", Number(e.target.value))}
                  min="1"
                  max="99"
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Target Return Multiple (x)
                </label>
                <input
                  type="number"
                  value={formData.targetReturn}
                  onChange={(e) => updateField("targetReturn", Number(e.target.value))}
                  min="3"
                  step="0.5"
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm bg-background"
                />
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 text-xs">
                <p className="text-muted mb-1">Post-Money Valuation</p>
                <p className="font-bold font-mono text-sm">
                  ${(postMoneyValuation / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </ToolSection>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="secondary" className="flex-1">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Valuation Summary */}
          <ToolSection title="Valuation Summary">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                <p className="text-xs text-muted mb-1">Conservative</p>
                <p className="text-2xl font-extrabold font-mono">
                  ${(valuationSummary.range.low / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="bg-accent/10 border border-accent/30 rounded-[var(--radius-md)] p-4">
                <p className="text-xs text-muted mb-1">Median</p>
                <p className="text-2xl font-extrabold font-mono text-accent">
                  ${(valuationSummary.median / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                <p className="text-xs text-muted mb-1">Aggressive</p>
                <p className="text-2xl font-extrabold font-mono">
                  ${(valuationSummary.range.high / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {valuationSummary.methods.map((method, idx) => (
                <div
                  key={idx}
                  className="bg-soft border border-border rounded-[var(--radius-md)] p-3 hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{method.method}</p>
                    <p className="text-sm font-mono font-bold">
                      ${(method.valuation / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <p className="text-xs text-muted">{method.reasoning}</p>
                  {method.multiple && (
                    <p className="text-xs text-muted mt-1">Multiple: {method.multiple.toFixed(1)}x</p>
                  )}
                </div>
              ))}
            </div>
          </ToolSection>

          {/* Key Metrics */}
          <ToolSection title="Deal Metrics">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                <p className="text-xs text-muted mb-1">Average Revenue Multiple</p>
                <p className="text-2xl font-extrabold font-mono text-accent">
                  {valuationSummary.averageMultiple.toFixed(1)}x
                </p>
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                <p className="text-xs text-muted mb-1">Pre-Money Valuation</p>
                <p className="text-2xl font-extrabold font-mono">
                  ${(preMoneyValuation / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                <p className="text-xs text-muted mb-1">Founder Remaining %</p>
                <p className="text-2xl font-extrabold font-mono">
                  {(100 - formData.investorEquity).toFixed(1)}%
                </p>
              </div>
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                <p className="text-xs text-muted mb-1">Price Per Share</p>
                <p className="text-lg font-extrabold font-mono">
                  ${pricePerShare.toFixed(2)}
                </p>
              </div>
            </div>
          </ToolSection>

          {/* Interpretation */}
          <ToolSection title="Investor Perspective">
            <div className="bg-accent/10 border border-accent/30 rounded-[var(--radius-md)] p-4">
              <p className="text-sm leading-relaxed">
                Your {formData.stage} stage {formData.sector} company is valued at a median of{" "}
                <span className="font-bold">
                  ${(valuationSummary.median / 1000000).toFixed(1)}M
                </span>
                , representing a{" "}
                <span className="font-bold">{valuationSummary.averageMultiple.toFixed(1)}x</span>{" "}
                revenue multiple. This valuation is based on industry benchmarks for comparable companies,
                adjusted for your growth rate and stage. An investor putting in{" "}
                <span className="font-bold">${(formData.investmentAmount / 1000000).toFixed(1)}M</span>{" "}
                for <span className="font-bold">{formData.investorEquity.toFixed(1)}%</span> ownership
                values your company at <span className="font-bold">
                  ${(postMoneyValuation / 1000000).toFixed(1)}M
                </span>{" "}
                post-money.
              </p>
            </div>
          </ToolSection>
        </div>
      </div>
    </ToolPageLayout>
  );
}
