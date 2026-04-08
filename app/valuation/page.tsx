"use client";

import { useState, useMemo, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { RotateCcw, Save, Check, Info } from "lucide-react";
import { saveValuation } from "@/lib/db-valuation";

// Sector multiples and benchmarks
const SECTOR_DATA = {
  saas: { multiple: { low: 6, mid: 10, high: 15 }, growth: 0.4 },
  marketplace: { multiple: { low: 4, mid: 7, high: 12 }, growth: 0.35 },
  fintech: { multiple: { low: 5, mid: 8, high: 14 }, growth: 0.38 },
  deeptech: { multiple: { low: 3, mid: 5, high: 8 }, growth: 0.25 },
  biotech: { multiple: { low: 4, mid: 8, high: 15 }, growth: 0.30 },
  consumer: { multiple: { low: 2, mid: 4, high: 7 }, growth: 0.30 },
  agritech: { multiple: { low: 3, mid: 5, high: 9 }, growth: 0.28 },
  cleantech: { multiple: { low: 4, mid: 7, high: 12 }, growth: 0.32 },
  edtech: { multiple: { low: 3, mid: 6, high: 10 }, growth: 0.35 },
  proptech: { multiple: { low: 3, mid: 5, high: 8 }, growth: 0.28 },
};

const STAGE_DISCOUNT = {
  idea: 0.6,
  mvp: 0.7,
  seed: 0.8,
  seriesA: 0.9,
  seriesB: 1.0,
};

interface FormData {
  startupName: string;
  currency: "USD" | "EUR";
  sector: keyof typeof SECTOR_DATA;
  stage: keyof typeof STAGE_DISCOUNT;
  exitYear: number;
  revenueAtExit: number;
  evMultiple: number;
  currentRevenue: number;
  investmentAmount: number;
  targetIRR: number;
  postMoney: number;
  dilution: number;
}

const defaultFormData: FormData = {
  startupName: "",
  currency: "USD",
  sector: "saas",
  stage: "seed",
  exitYear: new Date().getFullYear() + 5,
  revenueAtExit: 5000000,
  evMultiple: 8,
  currentRevenue: 500000,
  investmentAmount: 500000,
  targetIRR: 40,
  postMoney: 4000000,
  dilution: 15,
};

export default function ValuationPage() {
  const { t, locale } = useI18n();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saved, setSaved] = useState(false);

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    setFormData(defaultFormData);
    setSaved(false);
  }, []);

  // Core calculations - MUST be defined before useCallback that uses it
  const calculations = useMemo(() => {
    const { 
      sector, stage, exitYear, revenueAtExit, evMultiple, 
      currentRevenue, investmentAmount, targetIRR, postMoney, dilution 
    } = formData;

    const currentYear = new Date().getFullYear();
    const yearsToExit = Math.max(1, exitYear - currentYear);
    const sectorData = SECTOR_DATA[sector];
    const stageDiscount = STAGE_DISCOUNT[stage];

    // Exit Value (EV) = Revenue at Exit × EV/Revenue Multiple
    const exitValue = revenueAtExit * evMultiple;

    // Terminal Value after dilution
    const terminalValue = exitValue * (1 - dilution / 100);

    // Required ownership for target IRR
    // Investment × (1 + IRR)^years = Ownership × Terminal Value
    // Ownership = Investment × (1 + IRR)^years / Terminal Value
    const requiredMultiple = Math.pow(1 + targetIRR / 100, yearsToExit);
    const requiredOwnership = (investmentAmount * requiredMultiple) / terminalValue;

    // Pre-Money Valuation = Post-Money - Investment
    const preMoney = postMoney - investmentAmount;

    // Implied ownership from post-money
    const impliedOwnership = investmentAmount / postMoney;

    // Actual IRR based on implied ownership
    // Investment × (1 + IRR)^years = Ownership × Terminal Value
    // (1 + IRR)^years = Ownership × Terminal Value / Investment
    // IRR = (Ownership × Terminal Value / Investment)^(1/years) - 1
    const actualReturnMultiple = (impliedOwnership * terminalValue) / investmentAmount;
    const actualIRR = Math.pow(actualReturnMultiple, 1 / yearsToExit) - 1;

    // Cash-on-Cash multiple (CoCa)
    const coca = actualReturnMultiple;

    // Revenue growth rate implied
    const impliedGrowthRate = Math.pow(revenueAtExit / currentRevenue, 1 / yearsToExit) - 1;

    // Investor Score (0-100)
    // Based on: IRR vs target, CoCa, growth vs sector benchmark, stage risk
    let investorScore = 50;
    
    // IRR component (40 points max)
    const irrRatio = actualIRR / (targetIRR / 100);
    investorScore += Math.min(40, Math.max(-20, (irrRatio - 0.5) * 80));
    
    // CoCa component (20 points max)
    if (coca >= 10) investorScore += 20;
    else if (coca >= 5) investorScore += 15;
    else if (coca >= 3) investorScore += 10;
    else investorScore += Math.max(0, coca * 3);
    
    // Growth vs benchmark (20 points max)
    const growthRatio = impliedGrowthRate / sectorData.growth;
    investorScore += Math.min(20, Math.max(-10, (growthRatio - 0.5) * 30));
    
    // Stage adjustment (10 points max)
    investorScore += stageDiscount * 10;
    
    investorScore = Math.round(Math.min(100, Math.max(0, investorScore)));

    // Scenario analysis
    const bearMultiple = sectorData.multiple.low;
    const baseMultiple = sectorData.multiple.mid;
    const bullMultiple = sectorData.multiple.high;

    const calculateScenario = (mult: number) => {
      const ev = revenueAtExit * mult;
      const tv = ev * (1 - dilution / 100);
      const returnMult = (impliedOwnership * tv) / investmentAmount;
      const irr = Math.pow(returnMult, 1 / yearsToExit) - 1;
      // Pre-money = (Investment Amount / Implied Ownership Percentage) - Investment Amount
      const preMoneyValuation = (investmentAmount / impliedOwnership) - investmentAmount;
      return { preMoney: preMoneyValuation, ev, irr: irr * 100, coca: returnMult };
    };

    const bearCase = calculateScenario(bearMultiple);
    const baseCase = calculateScenario(baseMultiple);
    const bullCase = calculateScenario(bullMultiple);

    return {
      preMoney,
      postMoney,
      exitValue,
      terminalValue,
      requiredOwnership: requiredOwnership * 100,
      impliedOwnership: impliedOwnership * 100,
      actualIRR: actualIRR * 100,
      coca,
      impliedGrowthRate: impliedGrowthRate * 100,
      investorScore,
      yearsToExit,
      bearCase,
      baseCase,
      bullCase,
    };
  }, [formData]);

  const handleSave = useCallback(async () => {
    try {
      await saveValuation({
        name: formData.startupName || `valuation_${new Date().toISOString()}`,
        current_revenue: formData.currentRevenue,
        growth_rate: calculations.impliedGrowthRate,
        revenue_multiple: formData.evMultiple,
        estimated_valuation: calculations.preMoney,
        valuation_low: calculations.bearCase.preMoney,
        valuation_high: calculations.bullCase.preMoney,
        stage: formData.stage,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[v0] Error saving valuation:", error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [formData, calculations]);

  const formatCurrency = (value: number) => {
    const symbol = formData.currency === "USD" ? "$" : "EUR";
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
    return `${symbol}${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getScoreStatus = (score: number): "good" | "warning" | "danger" => {
    if (score >= 70) return "good";
    if (score >= 50) return "warning";
    return "danger";
  };

  const getIRRStatus = (irr: number): "good" | "warning" | "danger" => {
    if (irr >= formData.targetIRR) return "good";
    if (irr >= formData.targetIRR * 0.7) return "warning";
    return "danger";
  };

  const sectors = [
    { value: "saas", label: t("sector.saas") },
    { value: "marketplace", label: t("sector.marketplace") },
    { value: "fintech", label: t("sector.fintech") },
    { value: "deeptech", label: t("sector.deeptech") },
    { value: "biotech", label: t("sector.biotech") },
    { value: "consumer", label: t("sector.consumer") },
    { value: "agritech", label: t("sector.agritech") },
    { value: "cleantech", label: t("sector.cleantech") },
    { value: "edtech", label: t("sector.edtech") },
    { value: "proptech", label: t("sector.proptech") },
  ];

  const stages = [
    { value: "idea", label: t("stage.idea") },
    { value: "mvp", label: t("stage.mvp") },
    { value: "seed", label: t("stage.seed") },
    { value: "seriesA", label: t("stage.seriesA") },
    { value: "seriesB", label: t("stage.seriesB") },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="max-w-[var(--container-max)] mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-10">
            <p className="eyebrow mb-2">{t("valuation.kicker")}</p>
            <h1 className="heading-display mb-3">{t("valuation.title")}</h1>
            <p className="text-ink-secondary max-w-2xl">{t("valuation.description")}</p>
          </div>

          <div className="grid lg:grid-cols-[400px_1fr] gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              {/* General Information */}
              <Section title={t("valuation.general")}>
                <InputField
                  label={t("valuation.startupName")}
                  value={formData.startupName}
                  onChange={(v) => updateField("startupName", v)}
                  placeholder="TechCo..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label={t("valuation.currency")}
                    value={formData.currency}
                    onChange={(v) => updateField("currency", v as "USD" | "EUR")}
                    options={[
                      { value: "USD", label: "USD ($)" },
                      { value: "EUR", label: "EUR (EUR)" },
                    ]}
                  />
                  <SelectField
                    label={t("valuation.stage")}
                    value={formData.stage}
                    onChange={(v) => updateField("stage", v as keyof typeof STAGE_DISCOUNT)}
                    options={stages}
                  />
                </div>
                <SelectField
                  label={t("valuation.sector")}
                  value={formData.sector}
                  onChange={(v) => updateField("sector", v as keyof typeof SECTOR_DATA)}
                  options={sectors}
                />
              </Section>

              {/* Exit Assumptions */}
              <Section title={t("valuation.exitAssumptions")}>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label={t("valuation.exitYear")}
                    value={formData.exitYear}
                    onChange={(v) => updateField("exitYear", Number(v))}
                    type="number"
                    hint={t("valuation.exitYearHint")}
                  />
                  <InputField
                    label={t("valuation.evMultiple")}
                    value={formData.evMultiple}
                    onChange={(v) => updateField("evMultiple", Number(v))}
                    type="number"
                    hint={t("valuation.evMultipleHint")}
                  />
                </div>
                <InputField
                  label={t("valuation.revenueAtExit")}
                  value={formData.revenueAtExit}
                  onChange={(v) => updateField("revenueAtExit", Number(v))}
                  type="number"
                  hint={t("valuation.revenueAtExitHint")}
                />
                <InputField
                  label={t("valuation.currentRevenue")}
                  value={formData.currentRevenue}
                  onChange={(v) => updateField("currentRevenue", Number(v))}
                  type="number"
                />
              </Section>

              {/* Investment Details */}
              <Section title={t("valuation.investmentDetails")}>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label={t("valuation.investmentAmount")}
                    value={formData.investmentAmount}
                    onChange={(v) => updateField("investmentAmount", Number(v))}
                    type="number"
                    hint={t("valuation.investmentAmountHint")}
                  />
                  <InputField
                    label={t("valuation.targetIRR")}
                    value={formData.targetIRR}
                    onChange={(v) => updateField("targetIRR", Number(v))}
                    type="number"
                    hint={t("valuation.targetIRRHint")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label={t("valuation.postMoney")}
                    value={formData.postMoney}
                    onChange={(v) => updateField("postMoney", Number(v))}
                    type="number"
                    hint={t("valuation.postMoneyHint")}
                  />
                  <InputField
                    label={t("valuation.dilution")}
                    value={formData.dilution}
                    onChange={(v) => updateField("dilution", Number(v))}
                    type="number"
                    hint={t("valuation.dilutionHint")}
                  />
                </div>
              </Section>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleReset} variant="secondary" className="flex-1">
                  <RotateCcw className="w-4 h-4" />
                  {t("common.reset")}
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? t("common.saved") : t("common.saveToDashboard")}
                </Button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Key Results */}
              <Section title={t("valuation.results")}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ResultCard 
                    label={t("valuation.preMoney")} 
                    value={formatCurrency(calculations.preMoney)} 
                    featured 
                  />
                  <ResultCard 
                    label={t("valuation.exitValue")} 
                    value={formatCurrency(calculations.exitValue)} 
                  />
                  <ResultCard 
                    label={t("valuation.irr")} 
                    value={formatPercent(calculations.actualIRR)} 
                    status={getIRRStatus(calculations.actualIRR)}
                  />
                  <ResultCard 
                    label={t("valuation.investorScore")} 
                    value={`${calculations.investorScore}/100`}
                    status={getScoreStatus(calculations.investorScore)}
                  />
                </div>
              </Section>

              {/* Scenario Analysis */}
              <Section title={locale === "en" ? "Scenario Analysis" : "Analyse de Scenarios"}>
                <div className="grid grid-cols-3 gap-3">
                  <ScenarioCard
                    scenario={t("valuation.bearCase")}
                    preMoney={formatCurrency(calculations.bearCase.preMoney)}
                    irr={formatPercent(calculations.bearCase.irr)}
                    coca={calculations.bearCase.coca.toFixed(1) + "x"}
                  />
                  <ScenarioCard
                    scenario={t("valuation.baseCase")}
                    preMoney={formatCurrency(calculations.baseCase.preMoney)}
                    irr={formatPercent(calculations.baseCase.irr)}
                    coca={calculations.baseCase.coca.toFixed(1) + "x"}
                    active
                  />
                  <ScenarioCard
                    scenario={t("valuation.bullCase")}
                    preMoney={formatCurrency(calculations.bullCase.preMoney)}
                    irr={formatPercent(calculations.bullCase.irr)}
                    coca={calculations.bullCase.coca.toFixed(1) + "x"}
                  />
                </div>
              </Section>

              {/* Detailed Metrics */}
              <Section title={locale === "en" ? "Detailed Metrics" : "Metriques Detaillees"}>
                <div className="grid grid-cols-2 gap-4">
                  <MetricRow 
                    label={locale === "en" ? "Implied Ownership" : "Part Implicite"} 
                    value={formatPercent(calculations.impliedOwnership)} 
                  />
                  <MetricRow 
                    label={locale === "en" ? "Required Ownership (for target IRR)" : "Part Requise (pour TRI cible)"} 
                    value={formatPercent(calculations.requiredOwnership)} 
                  />
                  <MetricRow 
                    label={locale === "en" ? "Cash-on-Cash (CoCa)" : "Cash-on-Cash (CoCa)"} 
                    value={calculations.coca.toFixed(1) + "x"} 
                  />
                  <MetricRow 
                    label={locale === "en" ? "Terminal Value" : "Valeur Terminale"} 
                    value={formatCurrency(calculations.terminalValue)} 
                  />
                  <MetricRow 
                    label={locale === "en" ? "Implied Growth Rate" : "Taux de Croissance Implique"} 
                    value={formatPercent(calculations.impliedGrowthRate)} 
                  />
                  <MetricRow 
                    label={locale === "en" ? "Years to Exit" : "Annees avant Sortie"} 
                    value={calculations.yearsToExit.toString()} 
                  />
                </div>
              </Section>

              {/* Methodology & Interpretation */}
              <Section title={t("valuation.methodology")}>
                <div className="bg-soft rounded-[var(--radius-md)] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted shrink-0 mt-0.5" />
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {t("valuation.methodologyDesc")}
                    </p>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <Interpretation
                      label={locale === "en" ? "IRR Analysis" : "Analyse TRI"}
                      text={
                        calculations.actualIRR >= formData.targetIRR
                          ? locale === "en"
                            ? `Your deal offers ${formatPercent(calculations.actualIRR)} IRR, exceeding the ${formData.targetIRR}% target. This is attractive to investors.`
                            : `Votre deal offre un TRI de ${formatPercent(calculations.actualIRR)}, depassant la cible de ${formData.targetIRR}%. C'est attractif pour les investisseurs.`
                          : locale === "en"
                            ? `Your deal offers ${formatPercent(calculations.actualIRR)} IRR, below the ${formData.targetIRR}% target. Consider adjusting valuation or growth projections.`
                            : `Votre deal offre un TRI de ${formatPercent(calculations.actualIRR)}, en dessous de la cible de ${formData.targetIRR}%. Ajustez la valorisation ou les projections de croissance.`
                      }
                      type={calculations.actualIRR >= formData.targetIRR ? "good" : "warning"}
                    />
                    <Interpretation
                      label={locale === "en" ? "Investor Perspective" : "Perspective Investisseur"}
                      text={
                        calculations.investorScore >= 70
                          ? locale === "en"
                            ? `Score of ${calculations.investorScore}/100 indicates a strong investment opportunity. The deal fundamentals align well with VC expectations.`
                            : `Un score de ${calculations.investorScore}/100 indique une opportunite d'investissement solide. Les fondamentaux correspondent bien aux attentes VC.`
                          : locale === "en"
                            ? `Score of ${calculations.investorScore}/100 suggests room for improvement. Focus on growth metrics and valuation justification.`
                            : `Un score de ${calculations.investorScore}/100 suggere des ameliorations possibles. Concentrez-vous sur les metriques de croissance et la justification de la valorisation.`
                      }
                      type={calculations.investorScore >= 70 ? "good" : "warning"}
                    />
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
      <h3 className="text-sm font-bold tracking-tight mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-soft border border-border rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
      />
      {hint && <p className="text-[10px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-soft border border-border rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${featured ? "text-white/50" : "text-muted"}`}>
        {label}
      </p>
      <p
        className={`font-mono text-2xl font-bold tracking-tight leading-none ${
          featured ? "text-white" : status ? statusColors[status] : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ScenarioCard({
  scenario,
  preMoney,
  irr,
  coca,
  active,
}: {
  scenario: string;
  preMoney: string;
  irr: string;
  coca: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] p-4 ${
        active ? "bg-ink text-white" : "bg-soft border border-border"
      }`}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${active ? "text-white/50" : "text-muted"}`}>
        {scenario}
      </p>
      <p className={`font-mono text-xl font-bold tracking-tight mb-2 ${active ? "text-white" : ""}`}>
        {preMoney}
      </p>
      <div className={`text-xs space-y-0.5 ${active ? "text-white/60" : "text-muted"}`}>
        <p>IRR: {irr}</p>
        <p>CoCa: {coca}</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-xs text-ink-secondary">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}

function Interpretation({ label, text, type }: { label: string; text: string; type: "good" | "warning" }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${type === "good" ? "bg-success" : "bg-warning"}`} />
      <div>
        <p className="text-xs font-semibold text-ink mb-0.5">{label}</p>
        <p className="text-xs text-ink-secondary">{text}</p>
      </div>
    </div>
  );
}
