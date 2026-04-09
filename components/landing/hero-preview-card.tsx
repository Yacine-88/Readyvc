"use client";

import { Pill } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function HeroPreviewCard() {
  const { t } = useI18n();
  
  return (
    <div className="bg-card border border-border rounded-[var(--radius-xl)] shadow-lg overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-border bg-soft flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">{t("nav.dashboard")} Preview</p>
          <p className="text-sm font-bold tracking-tight">{t("dashboard.score.title")}</p>
        </div>
        <Pill>Live</Pill>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Score Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-soft border border-border rounded-[var(--radius-lg)] p-5">
            <p className="eyebrow mb-2">{t("dashboard.score.title")}</p>
            <p className="text-6xl font-extrabold tracking-tighter leading-none mb-2 font-mono">
              72<span className="text-muted text-3xl">/100</span>
            </p>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Strong foundation, room for improvement in data room completeness.
            </p>
          </div>

          <div className="space-y-4">
            <PreviewMiniCard label={t("nav.valuation")} value="$4.2M" />
            <PreviewMiniCard label="Runway" value="14 mo" />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-3">
          <MetricMiniCard label="MRR" value="$18K" />
          <MetricMiniCard label="Growth" value="+24%" />
          <MetricMiniCard label="LTV" value="$2.4K" />
          <MetricMiniCard label="CAC" value="$320" />
        </div>

        {/* Bottom Section */}
        <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
          <p className="eyebrow mb-1">{t("dashboard.actions.title")}</p>
          <p className="text-sm font-semibold text-ink mb-1">Complete Data Room</p>
          <p className="text-xs text-muted">
            Upload term sheet, cap table, and financial projections.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-[var(--radius-md)] p-4">
      <p className="text-xs font-semibold text-ink mb-1">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight leading-none mb-1 font-mono">{value}</p>
      <p className="text-[10px] text-muted">Estimated</p>
    </div>
  );
}

function MetricMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-[var(--radius-md)] p-3">
      <p className="eyebrow text-[9px] mb-1">{label}</p>
      <p className="text-lg font-extrabold tracking-tight leading-none font-mono">{value}</p>
    </div>
  );
}
