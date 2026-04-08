"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useI18n } from "@/lib/i18n";
import { RotateCcw, Save, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { saveMetrics, getMetrics } from "@/lib/db-metrics";

// Sector-specific benchmarks
const SECTOR_BENCHMARKS = {
  saas: {
    label: { en: "SaaS & Subscription", fr: "SaaS & Abonnement" },
    metrics: {
      ltvCac: { good: 3, great: 5, label: "LTV:CAC" },
      churn: { good: 5, great: 2, inverted: true, label: "Monthly Churn %" },
      nrr: { good: 100, great: 120, label: "Net Revenue Retention %" },
      grossMargin: { good: 70, great: 80, label: "Gross Margin %" },
      growthRate: { good: 15, great: 30, label: "MoM Growth %" },
      magicNumber: { good: 0.75, great: 1, label: "Magic Number" },
    },
  },
  marketplace: {
    label: { en: "Marketplace & Commerce", fr: "Marketplace & Commerce" },
    metrics: {
      ltvCac: { good: 2.5, great: 4, label: "LTV:CAC" },
      churn: { good: 8, great: 4, inverted: true, label: "Monthly Churn %" },
      takeRate: { good: 10, great: 20, label: "Take Rate %" },
      grossMargin: { good: 40, great: 60, label: "Gross Margin %" },
      gmv: { good: 100000, great: 500000, label: "Monthly GMV ($)" },
      repeatRate: { good: 30, great: 50, label: "Repeat Purchase Rate %" },
    },
  },
  fintech: {
    label: { en: "Fintech & Payments", fr: "Fintech & Paiements" },
    metrics: {
      ltvCac: { good: 3, great: 5, label: "LTV:CAC" },
      churn: { good: 4, great: 2, inverted: true, label: "Monthly Churn %" },
      nrr: { good: 105, great: 130, label: "Net Revenue Retention %" },
      grossMargin: { good: 50, great: 70, label: "Gross Margin %" },
      transactionVolume: { good: 500000, great: 2000000, label: "Monthly Volume ($)" },
      revenuePerUser: { good: 50, great: 150, label: "ARPU ($)" },
    },
  },
  deeptech: {
    label: { en: "Deeptech & Hardware", fr: "Deeptech & Hardware" },
    metrics: {
      grossMargin: { good: 40, great: 60, label: "Gross Margin %" },
      r_dRatio: { good: 30, great: 50, label: "R&D / Revenue %" },
      contractValue: { good: 50000, great: 200000, label: "Avg Contract Value ($)" },
      salesCycle: { good: 180, great: 90, inverted: true, label: "Sales Cycle (days)" },
      patentCount: { good: 2, great: 5, label: "Patents Filed" },
      pilotConversion: { good: 30, great: 50, label: "Pilot Conversion %" },
    },
  },
  biotech: {
    label: { en: "Biotech & MedTech", fr: "Biotech & MedTech" },
    metrics: {
      grossMargin: { good: 60, great: 75, label: "Gross Margin %" },
      clinicalStage: { good: 1, great: 3, label: "Clinical Stage (1-4)" },
      pipelineValue: { good: 10000000, great: 50000000, label: "Pipeline Value ($)" },
      regulatoryProgress: { good: 50, great: 80, label: "Regulatory Progress %" },
      partnershipRevenue: { good: 500000, great: 2000000, label: "Partnership Revenue ($)" },
      ipProtection: { good: 70, great: 90, label: "IP Protection Score" },
    },
  },
  consumer: {
    label: { en: "Consumer & D2C", fr: "Consumer & D2C" },
    metrics: {
      ltvCac: { good: 2, great: 3.5, label: "LTV:CAC" },
      churn: { good: 10, great: 5, inverted: true, label: "Monthly Churn %" },
      repeatRate: { good: 25, great: 40, label: "Repeat Purchase Rate %" },
      grossMargin: { good: 50, great: 65, label: "Gross Margin %" },
      aov: { good: 50, great: 100, label: "Avg Order Value ($)" },
      conversionRate: { good: 2, great: 4, label: "Conversion Rate %" },
    },
  },
  agritech: {
    label: { en: "AgriTech & FoodTech", fr: "AgriTech & FoodTech" },
    metrics: {
      grossMargin: { good: 35, great: 50, label: "Gross Margin %" },
      farmersOnboarded: { good: 100, great: 500, label: "Farmers Onboarded" },
      yieldImprovement: { good: 10, great: 25, label: "Yield Improvement %" },
      costReduction: { good: 15, great: 30, label: "Cost Reduction %" },
      contractValue: { good: 10000, great: 50000, label: "Avg Contract Value ($)" },
      retention: { good: 70, great: 85, label: "Annual Retention %" },
    },
  },
  cleantech: {
    label: { en: "CleanTech & Energy", fr: "CleanTech & Energie" },
    metrics: {
      grossMargin: { good: 30, great: 50, label: "Gross Margin %" },
      co2Avoided: { good: 1000, great: 10000, label: "CO2 Avoided (tons)" },
      contractValue: { good: 100000, great: 500000, label: "Avg Contract Value ($)" },
      paybackPeriod: { good: 5, great: 3, inverted: true, label: "Customer Payback (years)" },
      projectPipeline: { good: 5, great: 15, label: "Projects in Pipeline" },
      unitEconomics: { good: 20, great: 40, label: "Unit Margin %" },
    },
  },
  edtech: {
    label: { en: "EdTech", fr: "EdTech" },
    metrics: {
      ltvCac: { good: 2.5, great: 4, label: "LTV:CAC" },
      churn: { good: 8, great: 4, inverted: true, label: "Monthly Churn %" },
      completionRate: { good: 30, great: 60, label: "Course Completion %" },
      nps: { good: 40, great: 60, label: "NPS Score" },
      revenuePerUser: { good: 100, great: 300, label: "ARPU ($)" },
      engagement: { good: 30, great: 60, label: "Weekly Active %" },
    },
  },
  proptech: {
    label: { en: "PropTech & Real Estate", fr: "PropTech & Immobilier" },
    metrics: {
      grossMargin: { good: 40, great: 60, label: "Gross Margin %" },
      transactionVolume: { good: 1000000, great: 5000000, label: "Monthly Volume ($)" },
      takeRate: { good: 2, great: 5, label: "Take Rate %" },
      listingsActive: { good: 500, great: 2000, label: "Active Listings" },
      conversionRate: { good: 3, great: 8, label: "Conversion Rate %" },
      repeatRate: { good: 20, great: 40, label: "Repeat Rate %" },
    },
  },
};

type SectorKey = keyof typeof SECTOR_BENCHMARKS;

interface SaaSFormData {
  mrr: number;
  newCustomers: number;
  churnedCustomers: number;
  cacSpend: number;
  totalCustomers: number;
  grossMargin: number;
  avgRevenuePerCustomer: number;
  cashBalance: number;
  monthlyBurn: number;
}

const defaultSaaSData: SaaSFormData = {
  mrr: 15000,
  newCustomers: 25,
  churnedCustomers: 2,
  cacSpend: 5000,
  totalCustomers: 200,
  grossMargin: 75,
  avgRevenuePerCustomer: 75,
  cashBalance: 500000,
  monthlyBurn: 35000,
};

export default function MetricsPage() {
  const { t, locale } = useI18n();
  const [sector, setSector] = useState<SectorKey>("saas");
  const [formData, setFormData] = useState<SaaSFormData>(defaultSaaSData);
  const [saved, setSaved] = useState(false);

  const updateField = useCallback(<K extends keyof SaaSFormData>(field: K, value: SaaSFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    setFormData(defaultSaaSData);
    setSaved(false);
  }, []);

  // Core calculations for SaaS (primary sector) - MUST be defined before handleSave
  const calculations = useMemo(() => {
    const { mrr, newCustomers, churnedCustomers, cacSpend, totalCustomers, grossMargin, avgRevenuePerCustomer, cashBalance, monthlyBurn } = formData;

    // ARR = MRR × 12
    const arr = mrr * 12;

    // CAC = Total Sales & Marketing Spend / New Customers
    const cac = newCustomers > 0 ? cacSpend / newCustomers : 0;

    // Churn Rate = Churned Customers / Total Customers
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;

    // Average Customer Lifetime (months) = 1 / Churn Rate
    const avgLifetime = churnRate > 0 ? 100 / churnRate : 60; // Cap at 60 months if no churn

    // LTV = ARPC × Gross Margin × Avg Lifetime
    const ltv = avgRevenuePerCustomer * (grossMargin / 100) * avgLifetime;

    // LTV:CAC Ratio
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // Net Revenue Retention (simplified)
    // NRR = (MRR at end - Churn + Expansion) / MRR at start
    // Simplified: assume expansion equals 20% of retained revenue
    const retainedMRR = mrr * (1 - churnRate / 100);
    const expansionMRR = retainedMRR * 0.2;
    const nrr = mrr > 0 ? ((retainedMRR + expansionMRR) / mrr) * 100 : 100;

    // Monthly Growth Rate
    const netNewCustomers = newCustomers - churnedCustomers;
    const customerGrowthRate = totalCustomers > 0 ? (netNewCustomers / totalCustomers) * 100 : 0;

    // MRR Growth (monthly growth rate of MRR, compound)
    // New MRR from new customers - Lost MRR from churn
    const newMRRFromNewCustomers = newCustomers * avgRevenuePerCustomer;
    const lostMRRFromChurn = churnedCustomers * avgRevenuePerCustomer;
    const netMRRGrowth = newMRRFromNewCustomers - lostMRRFromChurn;
    const mrrGrowth = mrr > 0 ? (netMRRGrowth / mrr) * 100 : 0;

    // Magic Number = Net New ARR / S&M Spend (previous quarter)
    const netNewARR = (newCustomers - churnedCustomers) * avgRevenuePerCustomer * 12;
    const magicNumber = cacSpend > 0 ? netNewARR / (cacSpend * 3) : 0; // Quarterly S&M

    // CAC Payback (months) = CAC / (ARPC × Gross Margin)
    const monthlyContribution = avgRevenuePerCustomer * (grossMargin / 100);
    const cacPayback = monthlyContribution > 0 ? cac / monthlyContribution : 0;

    // Runway (months) = Cash Balance / Monthly Burn
    const runway = monthlyBurn > 0 ? cashBalance / monthlyBurn : 999;

    // Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
    const newMRR = newCustomers * avgRevenuePerCustomer;
    const churnedMRR = churnedCustomers * avgRevenuePerCustomer;
    const quickRatio = churnedMRR > 0 ? (newMRR + expansionMRR) / churnedMRR : newMRR > 0 ? 10 : 0;

    return {
      arr,
      mrr,
      cac,
      ltv,
      ltvCacRatio,
      churnRate,
      nrr,
      mrrGrowth,
      magicNumber,
      cacPayback,
      runway,
      quickRatio,
      grossMargin,
      netNewCustomers,
      avgLifetime,
    };
  }, [formData]);

  const handleSave = useCallback(async () => {
    try {
      await saveMetrics({
        name: `${sector}_metrics_${new Date().toISOString()}`,
        monthly_revenue: formData.mrr,
        monthly_growth_rate: calculations.mrrGrowth,
        customer_acquisition_cost: calculations.cac,
        lifetime_value: calculations.ltv,
        monthly_churn_rate: calculations.churnRate,
        magic_number: calculations.magicNumber,
        payback_period: Math.round(calculations.cacPayback),
        rule_of_40_score: calculations.mrrGrowth + (calculations.churnRate > 0 ? 40 - calculations.churnRate : 40),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[v0] Error saving metrics:", error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [formData, sector, calculations]);

  const getStatus = (value: number, benchmark: { good: number; great: number; inverted?: boolean }): "good" | "warning" | "danger" => {
    if (benchmark.inverted) {
      if (value <= benchmark.great) return "good";
      if (value <= benchmark.good) return "warning";
      return "danger";
    }
    if (value >= benchmark.great) return "good";
    if (value >= benchmark.good) return "warning";
    return "danger";
  };

  const getTrend = (value: number, benchmark: { good: number; great: number; inverted?: boolean }) => {
    const status = getStatus(value, benchmark);
    if (status === "good") return <TrendingUp className="w-4 h-4 text-success" />;
    if (status === "danger") return <TrendingDown className="w-4 h-4 text-danger" />;
    return <Minus className="w-4 h-4 text-warning" />;
  };

  const sectorBenchmark = SECTOR_BENCHMARKS[sector];

  // Generate insights based on calculations
  const insights = useMemo(() => {
    const list: { type: "good" | "warning"; text: string }[] = [];
    
    if (calculations.ltvCacRatio >= 3) {
      list.push({
        type: "good",
        text: locale === "en" 
          ? `Your LTV:CAC ratio of ${calculations.ltvCacRatio.toFixed(1)}x is excellent. Investors typically look for 3x+ at your stage.`
          : `Votre ratio LTV:CAC de ${calculations.ltvCacRatio.toFixed(1)}x est excellent. Les investisseurs recherchent generalement 3x+ a votre stade.`
      });
    } else {
      list.push({
        type: "warning",
        text: locale === "en"
          ? `Your LTV:CAC ratio of ${calculations.ltvCacRatio.toFixed(1)}x is below the 3x benchmark. Consider reducing CAC or increasing customer lifetime value.`
          : `Votre ratio LTV:CAC de ${calculations.ltvCacRatio.toFixed(1)}x est en dessous du benchmark de 3x. Reduisez le CAC ou augmentez la valeur vie client.`
      });
    }

    if (calculations.churnRate <= 5) {
      list.push({
        type: "good",
        text: locale === "en"
          ? `Net revenue retention appears strong with ${calculations.churnRate.toFixed(1)}% churn. This signals product-market fit.`
          : `La retention nette semble forte avec ${calculations.churnRate.toFixed(1)}% de churn. Cela signale un product-market fit.`
      });
    } else {
      list.push({
        type: "warning",
        text: locale === "en"
          ? `Monthly churn of ${calculations.churnRate.toFixed(1)}% is high. Focus on customer success and onboarding to reduce churn.`
          : `Un churn mensuel de ${calculations.churnRate.toFixed(1)}% est eleve. Concentrez-vous sur le succes client et l'onboarding.`
      });
    }

    if (calculations.runway < 12) {
      list.push({
        type: "warning",
        text: locale === "en"
          ? `Consider extending runway to 18+ months before fundraising for better negotiating position. Current: ${Math.round(calculations.runway)} months.`
          : `Etendez le runway a 18+ mois avant de lever pour une meilleure position de negociation. Actuel: ${Math.round(calculations.runway)} mois.`
      });
    } else {
      list.push({
        type: "good",
        text: locale === "en"
          ? `Your runway of ${Math.round(calculations.runway)} months gives you flexibility in fundraising timing.`
          : `Votre runway de ${Math.round(calculations.runway)} mois vous donne de la flexibilite pour le timing de levee.`
      });
    }

    return list;
  }, [calculations, locale]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="max-w-[var(--container-max)] mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-10">
            <p className="eyebrow mb-2">{t("metrics.kicker")}</p>
            <h1 className="heading-display mb-3">{t("metrics.title")}</h1>
            <p className="text-ink-secondary max-w-2xl">{t("metrics.description")}</p>
          </div>

          {/* Sector Tabs */}
          <div className="flex flex-wrap gap-0 border-b border-border mb-8 -mt-2 overflow-x-auto">
            {(Object.keys(SECTOR_BENCHMARKS) as SectorKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSector(key)}
                className={`px-5 py-3 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  sector === key
                    ? "text-ink border-ink"
                    : "text-muted border-transparent hover:text-ink"
                }`}
              >
                {sectorBenchmark.label[locale]}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-8">
            {/* Input Panel */}
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5 lg:sticky lg:top-24">
                <h3 className="text-sm font-bold tracking-tight mb-4">{t("metrics.yourData")}</h3>
                <div className="space-y-4">
                  <InputField
                    label={t("metrics.mrr")}
                    value={formData.mrr}
                    onChange={(v) => updateField("mrr", Number(v))}
                    type="number"
                    hint={t("metrics.mrrHint")}
                  />
                  <InputField
                    label={t("metrics.newCustomers")}
                    value={formData.newCustomers}
                    onChange={(v) => updateField("newCustomers", Number(v))}
                    type="number"
                    hint={t("metrics.newCustomersHint")}
                  />
                  <InputField
                    label={t("metrics.churnedCustomers")}
                    value={formData.churnedCustomers}
                    onChange={(v) => updateField("churnedCustomers", Number(v))}
                    type="number"
                    hint={t("metrics.churnedCustomersHint")}
                  />
                  <InputField
                    label={t("metrics.cacSpend")}
                    value={formData.cacSpend}
                    onChange={(v) => updateField("cacSpend", Number(v))}
                    type="number"
                    hint={t("metrics.cacSpendHint")}
                  />
                  <InputField
                    label={t("metrics.totalCustomers")}
                    value={formData.totalCustomers}
                    onChange={(v) => updateField("totalCustomers", Number(v))}
                    type="number"
                    hint={t("metrics.totalCustomersHint")}
                  />
                  <InputField
                    label={t("metrics.grossMargin")}
                    value={formData.grossMargin}
                    onChange={(v) => updateField("grossMargin", Number(v))}
                    type="number"
                    hint={t("metrics.grossMarginHint")}
                  />
                  <InputField
                    label={locale === "en" ? "Avg Revenue Per Customer ($)" : "CA Moyen par Client ($)"}
                    value={formData.avgRevenuePerCustomer}
                    onChange={(v) => updateField("avgRevenuePerCustomer", Number(v))}
                    type="number"
                  />
                  <InputField
                    label={locale === "en" ? "Cash Balance ($)" : "Tresorerie ($)"}
                    value={formData.cashBalance}
                    onChange={(v) => updateField("cashBalance", Number(v))}
                    type="number"
                  />
                  <InputField
                    label={locale === "en" ? "Monthly Burn ($)" : "Burn Mensuel ($)"}
                    value={formData.monthlyBurn}
                    onChange={(v) => updateField("monthlyBurn", Number(v))}
                    type="number"
                  />

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleReset} variant="secondary" className="flex-1">
                      <RotateCcw className="w-4 h-4" />
                      {t("common.reset")}
                    </Button>
                    <Button onClick={handleSave} className="flex-1">
                      {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {saved ? t("common.saved") : t("common.save")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-5">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="MRR"
                  value={`$${calculations.mrr.toLocaleString()}`}
                  description={t("metrics.mrr").split("(")[0].trim()}
                  status={getStatus(calculations.mrr, { good: 10000, great: 50000 })}
                  benchmark={locale === "en" ? "Target: $10K-50K at seed" : "Cible: $10K-50K en seed"}
                />
                <MetricCard
                  label="ARR"
                  value={`$${calculations.arr.toLocaleString()}`}
                  description={t("metrics.arr")}
                  status={getStatus(calculations.arr, { good: 100000, great: 500000 })}
                  benchmark={locale === "en" ? `Growth: +${calculations.mrrGrowth.toFixed(0)}% MoM` : `Croissance: +${calculations.mrrGrowth.toFixed(0)}% MoM`}
                />
                <MetricCard
                  label="CAC"
                  value={`$${calculations.cac.toFixed(0)}`}
                  description={t("metrics.cac")}
                  status={getStatus(calculations.cac, { good: 500, great: 200, inverted: true })}
                  benchmark={locale === "en" ? "Target: < $500 for SaaS" : "Cible: < $500 pour SaaS"}
                />
                <MetricCard
                  label="LTV"
                  value={`$${calculations.ltv.toFixed(0)}`}
                  description={t("metrics.ltv")}
                  status={getStatus(calculations.ltv, { good: 1000, great: 3000 })}
                  benchmark={`LTV:CAC = ${calculations.ltvCacRatio.toFixed(1)}x`}
                />
              </div>

              {/* Runway Card */}
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
                <h3 className="text-sm font-bold tracking-tight mb-4">{t("metrics.runway")}</h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted">{t("metrics.runwayMonths")}</p>
                  <p className="font-mono text-2xl font-bold tracking-tight">
                    {Math.min(Math.round(calculations.runway), 99)} {locale === "en" ? "months" : "mois"}
                  </p>
                </div>
                <ProgressBar 
                  value={Math.min(calculations.runway, 24)} 
                  max={24} 
                  status={calculations.runway >= 18 ? "good" : calculations.runway >= 12 ? "warning" : "danger"} 
                  size="md" 
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-muted font-medium">0 {locale === "en" ? "mo" : "m"}</span>
                  <span className="text-[10px] text-muted font-medium">12 {locale === "en" ? "mo" : "m"}</span>
                  <span className="text-[10px] text-muted font-medium">24 {locale === "en" ? "mo" : "m"}</span>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
                <h3 className="text-sm font-bold tracking-tight mb-4">
                  {locale === "en" ? "Additional Metrics" : "Metriques Additionnelles"}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SmallMetric
                    label={locale === "en" ? "Churn Rate" : "Taux de Churn"}
                    value={`${calculations.churnRate.toFixed(1)}%`}
                    trend={getTrend(calculations.churnRate, { good: 5, great: 2, inverted: true })}
                  />
                  <SmallMetric
                    label="NRR"
                    value={`${calculations.nrr.toFixed(0)}%`}
                    trend={getTrend(calculations.nrr, { good: 100, great: 120 })}
                  />
                  <SmallMetric
                    label={locale === "en" ? "Quick Ratio" : "Quick Ratio"}
                    value={calculations.quickRatio.toFixed(1)}
                    trend={getTrend(calculations.quickRatio, { good: 2, great: 4 })}
                  />
                  <SmallMetric
                    label={locale === "en" ? "Magic Number" : "Magic Number"}
                    value={calculations.magicNumber.toFixed(2)}
                    trend={getTrend(calculations.magicNumber, { good: 0.75, great: 1 })}
                  />
                  <SmallMetric
                    label={locale === "en" ? "CAC Payback" : "Payback CAC"}
                    value={`${calculations.cacPayback.toFixed(0)} ${locale === "en" ? "mo" : "m"}`}
                    trend={getTrend(calculations.cacPayback, { good: 12, great: 6, inverted: true })}
                  />
                  <SmallMetric
                    label={locale === "en" ? "Avg Lifetime" : "Duree Moyenne"}
                    value={`${calculations.avgLifetime.toFixed(0)} ${locale === "en" ? "mo" : "m"}`}
                    trend={getTrend(calculations.avgLifetime, { good: 24, great: 48 })}
                  />
                </div>
              </div>

              {/* Analysis */}
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
                <h3 className="text-sm font-bold tracking-tight mb-4">{t("metrics.analysis")}</h3>
                <div className="space-y-4">
                  {insights.map((insight, i) => (
                    <AnalysisPoint key={i} type={insight.type} text={insight.text} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Components

function InputField({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-soft border border-border rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
      />
      {hint && <p className="text-[10px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  status,
  benchmark,
}: {
  label: string;
  value: string;
  description: string;
  status: "good" | "warning" | "danger";
  benchmark: string;
}) {
  const statusColors = {
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  const dotColors = {
    good: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div className="bg-card border border-border rounded-[var(--radius-md)] p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      </div>
      <p className={`font-mono text-3xl font-bold tracking-tight leading-none mb-2 ${statusColors[status]}`}>
        {value}
      </p>
      <p className="text-xs text-ink-secondary mb-1">{description}</p>
      <p className="text-[10px] text-muted font-mono">{benchmark}</p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-xs text-muted mb-0.5">{label}</p>
        <p className="font-mono text-sm font-semibold">{value}</p>
      </div>
      {trend}
    </div>
  );
}

function AnalysisPoint({ type, text }: { type: "good" | "warning"; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
          type === "good"
            ? "bg-success/10 text-success"
            : "bg-warning/10 text-warning"
        }`}
      >
        {type === "good" ? "+" : "!"}
      </span>
      <p className="text-sm text-ink-secondary leading-relaxed">{text}</p>
    </div>
  );
}
