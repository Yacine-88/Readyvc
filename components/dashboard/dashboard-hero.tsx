"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { getLocalReadinessScore, type LocalReadinessData } from "@/lib/local-readiness";
import { getFounderProfile } from "@/lib/onboard";
import { getCompletedSteps, FLOW_STEPS, type FlowStepId } from "@/lib/flow";
import { AssessmentActions } from "./assessment-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const TOOL_HREFS: Record<FlowStepId, string> = {
  metrics:   "/metrics",
  valuation: "/valuation",
  qa:        "/qa",
  captable:  "/captable",
  pitch:     "/pitch",
  dataroom:  "/dataroom",
  dashboard: "/dashboard",
};

const TOOL_LABELS: Record<FlowStepId, string> = {
  metrics:   "Metrics",
  valuation: "Valuation",
  qa:        "Q&A",
  captable:  "Cap Table",
  pitch:     "Pitch",
  dataroom:  "Data Room",
  dashboard: "Dashboard",
};

const SCORE_KEYS: Partial<Record<FlowStepId, keyof LocalReadinessData>> = {
  metrics:   "metrics_score",
  valuation: "valuation_score",
  qa:        "qa_score",
  captable:  "cap_table_score",
  pitch:     "pitch_score",
  dataroom:  "dataroom_score",
};

function getNextStep(data: LocalReadinessData, completedSteps: FlowStepId[]) {
  const toolSteps = FLOW_STEPS.filter((s) => s.id !== "dashboard");
  for (const step of toolSteps) {
    const scoreKey = SCORE_KEYS[step.id];
    const score = scoreKey ? (data[scoreKey] as number) : 0;
    if (score > 0 && !completedSteps.includes(step.id)) return step;
  }
  for (const step of toolSteps) {
    if (!completedSteps.includes(step.id)) return step;
  }
  return null;
}

const CALENDLY_URL = "https://calendly.com/vcready/30min";

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardHero() {
  const { t } = useI18n();
  const [data, setData] = useState<LocalReadinessData | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [startupName, setStartupName] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  useEffect(() => {
    setData(getLocalReadinessScore());
    setCompletedSteps(getCompletedSteps());
    const profile = getFounderProfile();
    if (profile) {
      setFirstName(profile.name.split(" ")[0]);
      setStartupName(profile.startupName);
      setCountry(profile.country ?? null);
      setSector(profile.sector ?? null);
    }
  }, []);

  const overall = data?.overall_score ?? null;
  const valuation = data?.estimated_valuation ?? null;
  const runway = data?.runway ?? null;
  const nextStep = data ? getNextStep(data, completedSteps) : null;
  const completedCount = FLOW_STEPS.filter(
    (s) => s.id !== "dashboard" && completedSteps.includes(s.id)
  ).length;
  const totalTools = FLOW_STEPS.filter((s) => s.id !== "dashboard").length;

  return (
    <Card className="overflow-hidden" padding="lg">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left */}
        <div className="flex flex-col justify-between min-h-[240px]">
          <div>
            <p className="eyebrow inline-flex items-center gap-2.5 mb-3">
              <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
              {startupName ? `${startupName} · Dashboard` : "Dashboard"}
            </p>
            <h1 className="heading-display text-3xl md:text-4xl text-balance mb-3">
              {t("dashboard.welcome")},{" "}
              <span className="text-muted">{firstName ?? "Founder"}.</span>
            </h1>
            {(country || sector) && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {country && (
                  <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-soft text-xs font-medium text-ink">
                    {countryFlag(country)} {country}
                  </span>
                )}
                {sector && (
                  <span className="inline-flex items-center h-7 px-2.5 rounded-full border border-border bg-soft text-xs font-medium text-ink">
                    {sector}
                  </span>
                )}
              </div>
            )}
            <p className="text-ink-secondary text-sm leading-relaxed max-w-md">
              {completedCount === 0
                ? "Start your assessment to see your investor readiness score."
                : completedCount === totalTools
                ? "All tools complete. Review your score and book a readiness call."
                : `${completedCount} of ${totalTools} tools completed.`}
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {nextStep ? (
              <Link
                href={TOOL_HREFS[nextStep.id]}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Continue: {TOOL_LABELS[nextStep.id]} →
              </Link>
            ) : (
              <Link
                href="/readiness"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                View full score →
              </Link>
            )}
            <Link
              href="/investor-matching"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/30 transition-colors"
            >
              Find investors →
            </Link>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/30 transition-colors"
            >
              Book a readiness review
            </a>
          </div>

          {/* Assessment actions */}
          <div className="mt-4 pt-4 border-t border-border">
            <AssessmentActions />
          </div>
        </div>

        {/* Right: live summary cards */}
        <div className="grid gap-3">
          <MiniSummaryCard
            label="Readiness Score"
            value={overall !== null ? String(overall) : "—"}
            suffix={overall !== null ? "/100" : undefined}
            description={
              overall === null
                ? "Complete a tool to see your score"
                : overall >= 70
                ? "Investor ready"
                : overall >= 40
                ? "Keep completing tools"
                : "Start with Metrics & Q&A"
            }
          />
          <MiniSummaryCard
            label="Estimated Valuation"
            value={valuation ? fmt(valuation) : "—"}
            description={
              valuation
                ? `${data?.stage ?? ""} ${data?.sector ?? ""}`.trim() || "Based on your inputs"
                : "Complete Valuation to see"
            }
          />
          <MiniSummaryCard
            label="Runway"
            value={runway ? `${Math.min(Math.round(runway), 99)} mo` : "—"}
            description={
              runway
                ? runway >= 18
                  ? "Strong runway for fundraising"
                  : runway >= 12
                  ? "Consider extending before raising"
                  : "Prioritize extending runway"
                : "Complete Metrics to see"
            }
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Country flag helper ──────────────────────────────────────────────────────

const COUNTRY_CODES: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "argentina": "AR",
  "australia": "AU", "austria": "AT", "bangladesh": "BD", "belgium": "BE",
  "brazil": "BR", "canada": "CA", "chile": "CL", "china": "CN",
  "colombia": "CO", "czech republic": "CZ", "denmark": "DK", "egypt": "EG",
  "ethiopia": "ET", "finland": "FI", "france": "FR", "germany": "DE",
  "ghana": "GH", "greece": "GR", "hungary": "HU", "india": "IN",
  "indonesia": "ID", "ireland": "IE", "israel": "IL", "italy": "IT",
  "japan": "JP", "kenya": "KE", "malaysia": "MY", "mexico": "MX",
  "morocco": "MA", "netherlands": "NL", "new zealand": "NZ", "nigeria": "NG",
  "norway": "NO", "pakistan": "PK", "peru": "PE", "philippines": "PH",
  "poland": "PL", "portugal": "PT", "romania": "RO", "russia": "RU",
  "saudi arabia": "SA", "senegal": "SN", "singapore": "SG", "south africa": "ZA",
  "south korea": "KR", "spain": "ES", "sweden": "SE", "switzerland": "CH",
  "taiwan": "TW", "thailand": "TH", "tunisia": "TN", "turkey": "TR",
  "ukraine": "UA", "united arab emirates": "AE", "uae": "AE",
  "united kingdom": "GB", "uk": "GB", "united states": "US", "usa": "US",
  "vietnam": "VN",
};

function countryFlag(country: string): string {
  const code = COUNTRY_CODES[country.toLowerCase()];
  if (!code) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function MiniSummaryCard({
  label,
  value,
  suffix,
  description,
}: {
  label: string;
  value: string;
  suffix?: string;
  description: string;
}) {
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <p className="eyebrow mb-1.5">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight leading-none mb-1 font-mono">
        {value}
        {suffix && <span className="text-muted text-base font-bold">{suffix}</span>}
      </p>
      <p className="text-xs text-ink-secondary">{description}</p>
    </div>
  );
}
