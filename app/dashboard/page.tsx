"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { track } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { refreshUnifiedProfile, getProfileCompletionPct } from "@/lib/foundation/profile";
import { getLocalToolStates } from "@/lib/foundation/tool-states";
import {
  getReadinessRedFlags,
  getGlobalVerdict,
  getSnapshotHistory,
  saveSnapshot,
  computeGlobalReadiness,
  loadSnapshotHistory,
} from "@/lib/foundation/readiness-engine";
import { FLOW_STEPS, getCompletedSteps, type FlowStepId } from "@/lib/flow";
import type {
  FoundationTool,
  FounderStartupProfile,
  GlobalReadinessSnapshot,
  ReadinessRedFlag,
  ToolState,
} from "@/lib/foundation/types";
import { computeBenchmark, compareToMarket } from "@/lib/benchmark-engine";
import { COMPARABLES_DATA } from "@/lib/comparables-data";
import { buildAdvisory } from "@/lib/advisory-engine";
import type { AdvisoryOutput, AdvisoryItem } from "@/lib/advisory-engine";

// ─── Config ───────────────────────────────────────────────────────────────────

const WEIGHTS: Record<FoundationTool, number> = {
  metrics: 0.25, valuation: 0.20, qa: 0.20,
  pitch: 0.15, dataroom: 0.10, captable: 0.10,
};

const CALENDLY_URL = "https://calendly.com/vcready/30min";

const TOOL_LABELS: Record<FoundationTool, string> = {
  metrics: "Metrics", valuation: "Valuation", qa: "Q&A",
  captable: "Cap Table", pitch: "Pitch", dataroom: "Data Room",
};

const TOOL_HREFS: Record<FoundationTool, string> = {
  metrics: "/metrics", valuation: "/valuation", qa: "/qa",
  captable: "/captable", pitch: "/pitch", dataroom: "/dataroom",
};

const TOOL_WEIGHTS_LABEL: Record<FoundationTool, string> = {
  metrics: "25%", valuation: "20%", qa: "20%",
  captable: "10%", pitch: "15%", dataroom: "10%",
};

// Semantic color classes by score band
function scoreBand(s: number): { text: string; bg: string; soft: string; border: string; hex: string } {
  if (s >= 80) return { text: "text-success", bg: "bg-success", soft: "bg-success/10", border: "border-success/25", hex: "#0F6A46" };
  if (s >= 60) return { text: "text-success", bg: "bg-success", soft: "bg-success/10", border: "border-success/25", hex: "#0F6A46" };
  if (s >= 35) return { text: "text-warning", bg: "bg-warning", soft: "bg-warning/10", border: "border-warning/25", hex: "#8A6B1F" };
  return { text: "text-danger", bg: "bg-danger", soft: "bg-danger/10", border: "border-danger/25", hex: "#8C4343" };
}

function verdictConfig(v: string) {
  switch (v) {
    case "Strong":    return { badge: "bg-success/10 text-success border-success/20", bar: "bg-success",  tagline: "Ready for serious investor conversations." };
    case "Fundable":  return { badge: "bg-success/10 text-success border-success/20", bar: "bg-success",  tagline: "A solid profile — start targeted outreach." };
    case "Improving": return { badge: "bg-warning/10 text-warning border-warning/20", bar: "bg-warning",  tagline: "Good progress — close the remaining gaps before raising." };
    default:          return { badge: "bg-danger/10  text-danger  border-danger/20",  bar: "bg-danger",   tagline: "Focus on building the fundamentals before investor meetings." };
  }
}

// ─── Country flag ─────────────────────────────────────────────────────────────
// Maps country names (English + French + aliases) to ISO 3166-1 alpha-2 codes.
// Flag emoji is generated dynamically from the code — no hardcoded emoji needed.

const COUNTRY_TO_CODE: Record<string, string> = {
  // ── Aliases & abbreviations ─────────────────────────────────────────────────
  "us": "US", "usa": "US", "u.s.a.": "US", "uk": "GB", "uae": "AE",
  "dubai": "AE", "abu dhabi": "AE", "england": "GB", "britain": "GB",
  "great britain": "GB", "ksa": "SA", "korea": "KR", "holland": "NL",
  "türkiye": "TR",
  // ── English country names (A–Z) ─────────────────────────────────────────────
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
  "argentina": "AR", "armenia": "AM", "australia": "AU", "austria": "AT",
  "azerbaijan": "AZ", "bahrain": "BH", "bangladesh": "BD", "belarus": "BY",
  "belgium": "BE", "benin": "BJ", "bolivia": "BO", "bosnia": "BA",
  "brazil": "BR", "bulgaria": "BG", "burkina faso": "BF", "cameroon": "CM",
  "canada": "CA", "chile": "CL", "china": "CN", "colombia": "CO",
  "congo": "CG", "costa rica": "CR", "croatia": "HR", "czechia": "CZ",
  "czech republic": "CZ", "denmark": "DK", "ecuador": "EC", "egypt": "EG",
  "estonia": "EE", "ethiopia": "ET", "finland": "FI", "france": "FR",
  "georgia": "GE", "germany": "DE", "ghana": "GH", "greece": "GR",
  "guatemala": "GT", "guinea": "GN", "honduras": "HN", "hungary": "HU",
  "india": "IN", "indonesia": "ID", "iraq": "IQ", "ireland": "IE",
  "israel": "IL", "italy": "IT", "ivory coast": "CI", "jamaica": "JM",
  "japan": "JP", "jordan": "JO", "kazakhstan": "KZ", "kenya": "KE",
  "kuwait": "KW", "latvia": "LV", "lebanon": "LB", "libya": "LY",
  "lithuania": "LT", "luxembourg": "LU", "madagascar": "MG", "malaysia": "MY",
  "mali": "ML", "mauritania": "MR", "mauritius": "MU", "mexico": "MX",
  "moldova": "MD", "morocco": "MA", "mozambique": "MZ", "myanmar": "MM",
  "nepal": "NP", "netherlands": "NL", "new zealand": "NZ", "nicaragua": "NI",
  "niger": "NE", "nigeria": "NG", "norway": "NO", "oman": "OM",
  "pakistan": "PK", "panama": "PA", "paraguay": "PY", "peru": "PE",
  "philippines": "PH", "poland": "PL", "portugal": "PT", "qatar": "QA",
  "romania": "RO", "russia": "RU", "rwanda": "RW", "saudi arabia": "SA",
  "senegal": "SN", "serbia": "RS", "singapore": "SG", "slovakia": "SK",
  "slovenia": "SI", "somalia": "SO", "south africa": "ZA", "south korea": "KR",
  "spain": "ES", "sri lanka": "LK", "sudan": "SD", "sweden": "SE",
  "switzerland": "CH", "syria": "SY", "taiwan": "TW", "tanzania": "TZ",
  "thailand": "TH", "togo": "TG", "tunisia": "TN", "turkey": "TR",
  "uganda": "UG", "ukraine": "UA", "united arab emirates": "AE",
  "united kingdom": "GB", "united states": "US",
  "united states of america": "US", "uruguay": "UY", "uzbekistan": "UZ",
  "venezuela": "VE", "vietnam": "VN", "yemen": "YE", "zambia": "ZM",
  "zimbabwe": "ZW",
  // ── French country names (common for MENA/Africa founders) ──────────────────
  "algérie": "DZ", "maroc": "MA", "tunisie": "TN", "égypte": "EG",
  "libye": "LY", "mauritanie": "MR", "sénégal": "SN", "guinée": "GN",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "cameroun": "CM",
  "soudan": "SD", "éthiopie": "ET",
  "allemagne": "DE", "espagne": "ES", "italie": "IT", "belgique": "BE",
  "pays-bas": "NL", "suisse": "CH", "suède": "SE", "norvège": "NO",
  "danemark": "DK", "finlande": "FI", "irlande": "IE", "pologne": "PL",
  "roumanie": "RO", "grèce": "GR", "autriche": "AT",
  "arabie saoudite": "SA", "emirats arabes unis": "AE", "émirats arabes unis": "AE",
  "jordanie": "JO", "liban": "LB", "irak": "IQ", "syrie": "SY",
  "inde": "IN", "chine": "CN", "japon": "JP", "brésil": "BR",
  "mexique": "MX", "argentine": "AR", "colombie": "CO", "chili": "CL",
};

/** Convert a 2-letter ISO 3166-1 alpha-2 code to the corresponding flag emoji. */
function isoToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join("");
}

/**
 * Return a flag emoji for a free-text country name or ISO code.
 * Case-insensitive. Falls back to "" if unknown.
 */
function getCountryFlag(country: string): string {
  if (!country) return "";
  const key = country.trim().toLowerCase();
  // Direct 2-letter ISO code (e.g. "fr", "DZ")
  if (/^[a-z]{2}$/.test(key)) return isoToFlag(key);
  // Name lookup
  const iso = COUNTRY_TO_CODE[key];
  return iso ? isoToFlag(iso) : "";
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  if (!v || v <= 0) return "—";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function fmtPct(v: number): string {
  return v > 0 ? `${Math.round(v)}%` : "—";
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch { return "—"; }
}

// ─── Count-up animation ───────────────────────────────────────────────────────

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ─── Score Arc (SVG) ──────────────────────────────────────────────────────────

function ScoreArc({ score, colorScore, size = 96, dark = false }: { score: number; colorScore?: number; size?: number; dark?: boolean }) {
  const sw = size >= 110 ? 10 : 9;
  const r = (size - sw * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { hex } = scoreBand(colorScore ?? score);
  const trackColor = dark ? "rgba(255,255,255,0.15)" : "#E7E3DA";
  const numSize = size >= 110 ? "text-3xl" : "text-2xl";
  const numColor = dark ? "text-white" : "";
  const subColor = dark ? "text-white/40" : "text-muted";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={hex} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${numSize} font-black font-mono leading-none ${numColor}`}>{score}</span>
        <span className={`text-[10px] font-medium leading-none mt-0.5 ${subColor}`}>/100</span>
      </div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, height = 52 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const PAD = 6;
  const H = height - PAD * 2;
  // Auto-scale with small padding around the range
  const min = Math.max(0, Math.min(...data) - 4);
  const max = Math.min(100, Math.max(...data) + 4);
  const range = max - min || 1;
  // Responsive width — use viewBox and let SVG scale
  const VW = 280;
  const px = (i: number) => PAD + (i / (data.length - 1)) * (VW - PAD * 2);
  const py = (v: number) => PAD + H - ((v - min) / range) * H;
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  // Area fill path
  const areaPath =
    `M${px(0)},${py(data[0])} ` +
    data.slice(1).map((v, i) => `L${px(i + 1)},${py(v)}`).join(" ") +
    ` L${px(data.length - 1)},${PAD + H} L${px(0)},${PAD + H} Z`;
  const trend = data[data.length - 1] >= data[0];
  const color = trend ? "#0F6A46" : "#8C4343";
  const lastX = px(data.length - 1);
  const lastY = py(data[data.length - 1]);
  return (
    <svg viewBox={`0 0 ${VW} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <polyline fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round"
        strokeLinecap="round" points={pts} />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}

// ─── Range Bar ────────────────────────────────────────────────────────────────
// Shows P25 / median / P75 distribution with an optional "you" marker

function RangeBar({ p25, median, p75, you, label = "Your target" }: {
  p25: number; median: number; p75: number; you?: number | null; label?: string;
}) {
  const min = 0;
  const max = Math.max(p75 * 1.4, (you ?? 0) * 1.1, 1);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  function fmtM(v: number) {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    if (v >= 1)    return `$${Math.round(v)}M`;
    return `$${(v * 1000).toFixed(0)}K`;
  }

  const youPct = you != null ? pct(you) : null;
  const youColor = you == null ? null :
    you >= p75 ? "#8A6B1F" :
    you >= median ? "#0F6A46" : "#6B7280";

  return (
    <div className="w-full">
      {/* Track */}
      <div className="relative h-2 bg-border rounded-full overflow-visible my-2">
        {/* P25→P75 band */}
        <div
          className="absolute top-0 h-full rounded-full bg-accent/20"
          style={{ left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%` }}
        />
        {/* Median tick */}
        <div
          className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-accent rounded-full"
          style={{ left: `${pct(median)}%` }}
        />
        {/* You marker */}
        {youPct != null && (
          <div
            className="absolute top-[-4px] w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ left: `calc(${youPct}% - 6px)`, backgroundColor: youColor! }}
          />
        )}
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>P25 {fmtM(p25)}</span>
        <span className="text-accent font-semibold">Median {fmtM(median)}</span>
        <span>P75 {fmtM(p75)}</span>
      </div>
      {youPct != null && (
        <p className="text-[10px] mt-1" style={{ color: youColor! }}>
          <span className="font-semibold">● {label}:</span> {fmtM(you!)}
          {you! >= p75 ? " — above P75" : you! >= median ? " — above median" : " — below median"}
        </p>
      )}
    </div>
  );
}

// ─── Compact tool row ─────────────────────────────────────────────────────────

function ToolRow({ tool, state }: { tool: FoundationTool; state: ToolState }) {
  const band = scoreBand(state.score);
  const isComplete = state.status === "completed";
  const isInProgress = state.status === "in_progress";
  const statusDot = isComplete ? "bg-success" : isInProgress ? "bg-warning" : "bg-border";
  const statusText = isComplete ? "Complete" : isInProgress ? "In progress" : "Not started";
  const statusColor = isComplete ? "text-success" : isInProgress ? "text-warning" : "text-muted";
  return (
    <Link href={TOOL_HREFS[tool]}
      className="grid grid-cols-[16px_1fr_80px_36px_36px_60px_28px] items-center gap-3 px-4 py-3 hover:bg-soft transition-colors group border-b border-border last:border-0"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
      <span className="text-sm font-semibold text-ink">{TOOL_LABELS[tool]}</span>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${state.score > 0 ? band.bg : ""}`}
          style={{ width: `${state.score}%` }} />
      </div>
      <span className={`text-xs font-black font-mono text-right ${state.score > 0 ? band.text : "text-muted"}`}>
        {state.score > 0 ? state.score : "—"}
      </span>
      <span className="text-[10px] text-muted text-right">{TOOL_WEIGHTS_LABEL[tool]}</span>
      <span className={`text-[10px] font-semibold ${statusColor}`}>{statusText}</span>
      <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity text-right">→</span>
    </Link>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ flag }: { flag: ReadinessRedFlag }) {
  return (
    <div className={`rounded-[var(--radius-md)] border-l-[3px] px-4 py-3 flex items-start justify-between gap-4 ${
      flag.blocking
        ? "bg-danger/5 border-l-danger border-danger/15 border border-l-[3px]"
        : "bg-warning/5 border-l-warning border-warning/15 border border-l-[3px]"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`inline-flex h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wide ${
            flag.blocking ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
          }`}>
            {flag.blocking ? "Blocker" : "Warning"}
          </span>
          <p className="text-sm font-bold text-ink">{flag.label}</p>
        </div>
        <p className="text-xs text-ink-secondary mt-1">{flag.reason}</p>
        <p className="text-xs text-muted mt-1 italic">{flag.action}</p>
      </div>
      {flag.href && (
        <Link href={flag.href}
          className="text-xs font-bold text-accent hover:underline shrink-0 mt-0.5"
        >Fix →</Link>
      )}
    </div>
  );
}

// ─── Advisory UI components ───────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { dot: "bg-danger",  text: "text-danger",  badge: "bg-danger/10 text-danger border-danger/20",  bg: "bg-danger/5  border-danger/15"  },
  high:     { dot: "bg-warning", text: "text-warning", badge: "bg-warning/10 text-warning border-warning/20", bg: "bg-warning/5 border-warning/15" },
  medium:   { dot: "bg-accent",  text: "text-accent",  badge: "bg-accent/10  text-accent  border-accent/20",  bg: "bg-soft border-border"           },
  low:      { dot: "bg-muted",   text: "text-muted",   badge: "bg-soft       text-muted    border-border",     bg: "bg-soft border-border"           },
} as const;

function AdvisoryItemRow({
  item,
  showTag = true,
  variant = "default",
}: {
  item: AdvisoryItem;
  showTag?: boolean;
  variant?: "default" | "challenge" | "action";
}) {
  const sev = item.severity ?? "medium";
  const cfg = SEVERITY_CONFIG[sev];

  const inner = (
    <div className={`rounded-[var(--radius-md)] border px-4 py-3 flex items-start gap-3 transition-colors ${cfg.bg} ${item.href ? "hover:border-ink/20" : ""}`}>
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          {showTag && item.tag && (
            <span className={`inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wide border ${cfg.badge}`}>
              {item.tag}
            </span>
          )}
          <p className="text-sm font-semibold text-ink leading-snug">{item.label}</p>
        </div>
        <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">{item.detail}</p>
      </div>
      {item.href && (
        <span className="text-xs font-bold text-accent shrink-0 mt-0.5 whitespace-nowrap">
          {variant === "action" ? "Go →" : variant === "challenge" ? "Fix →" : "→"}
        </span>
      )}
    </div>
  );

  if (!item.href) return inner;
  const isExt = item.href.startsWith("http");
  if (isExt) return <a href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link href={item.href}>{inner}</Link>;
}

interface AdvisorySectionProps {
  advisory: AdvisoryOutput;
}

function AdvisorySection({ advisory }: AdvisorySectionProps) {
  const { readiness_summary, recommended_strategy, top_priorities, investor_challenges, next_actions, primary_cta, secondary_cta, data_completeness } = advisory;

  const completenessNote =
    data_completeness === "minimal" ? "Complete more tools to improve advisory accuracy." :
    data_completeness === "partial" ? "Advisory based on partial data — more tools will sharpen these recommendations." :
    null;

  return (
    <div className="space-y-4">

      {/* ── Summary + Strategy ── */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-4">

        {/* Readiness summary */}
        <Card padding="sm">
          <CardHeader>
            <CardTitle kicker="Fundraising analysis">Advisor summary</CardTitle>
            {data_completeness !== "full" && (
              <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded px-2 py-0.5">
                Partial data
              </span>
            )}
          </CardHeader>
          <CardContent>
            <div className="border-l-[3px] border-accent pl-4 mb-4">
              <p className="text-sm text-ink-secondary leading-relaxed">{readiness_summary}</p>
            </div>
            {completenessNote && (
              <p className="text-xs text-muted italic">{completenessNote}</p>
            )}
          </CardContent>
        </Card>

        {/* Recommended strategy */}
        <Card padding="sm">
          <CardHeader>
            <CardTitle kicker="Strategic focus">What to do this week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-4 mb-4">
              <p className="text-sm font-semibold text-ink leading-relaxed">{recommended_strategy}</p>
            </div>
            {/* CTAs */}
            <div className="space-y-2">
              {primary_cta.ext ? (
                <a href={primary_cta.href} target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                >{primary_cta.label}</a>
              ) : (
                <Link href={primary_cta.href}
                  className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                >{primary_cta.label}</Link>
              )}
              {secondary_cta && (
                secondary_cta.ext ? (
                  <a href={secondary_cta.href} target="_blank" rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                  >{secondary_cta.label}</a>
                ) : (
                  <Link href={secondary_cta.href}
                    className="w-full inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                  >{secondary_cta.label}</Link>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Priorities + Challenges ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Top priorities */}
        <Card padding="sm">
          <CardHeader>
            <CardTitle kicker="Focus areas">Top priorities</CardTitle>
            <span className="text-xs text-muted">Ordered by impact</span>
          </CardHeader>
          <CardContent>
            {top_priorities.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm font-semibold text-success mb-1">No critical priorities</p>
                <p className="text-xs text-muted">Your readiness profile looks solid. Focus on maintaining quality.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {top_priorities.map((item, i) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <AdvisoryItemRow item={item} variant="action" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investor challenges */}
        <Card padding="sm">
          <CardHeader>
            <CardTitle kicker="Investor meeting prep">What they&apos;ll challenge</CardTitle>
            <span className="text-xs text-muted">Likely objections</span>
          </CardHeader>
          <CardContent>
            {investor_challenges.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm font-semibold text-success mb-1">No major red flags</p>
                <p className="text-xs text-muted">Complete more tools to surface likely investor objections.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {investor_challenges.map((item) => (
                  <AdvisoryItemRow key={item.id} item={item} variant="challenge" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Next actions ── */}
      <Card padding="sm">
        <CardHeader>
          <CardTitle kicker="Action plan">Next actions</CardTitle>
          <span className="text-xs text-muted">{next_actions.length} step{next_actions.length !== 1 ? "s" : ""}</span>
        </CardHeader>
        <CardContent>
          {next_actions.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-success mb-1">No immediate actions needed</p>
              <p className="text-xs text-muted">Keep your readiness profile up to date as your metrics evolve.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {next_actions.map((item, i) => {
                const sev = item.severity ?? "medium";
                const cfg = SEVERITY_CONFIG[sev];
                const inner = (
                  <div className={`h-full rounded-[var(--radius-md)] border p-3 flex flex-col gap-2 transition-colors ${cfg.bg} ${item.href ? "hover:border-ink/20" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-7 h-7 rounded-full bg-ink text-white text-xs font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {item.tag && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{item.tag}</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-ink leading-snug flex-1">{item.label}</p>
                    <p className="text-xs text-ink-secondary leading-relaxed">{item.detail}</p>
                    {item.href && (
                      <span className="text-xs font-bold text-accent mt-auto">
                        {item.href.startsWith("http") ? "Open →" : "Go →"}
                      </span>
                    )}
                  </div>
                );
                if (!item.href) return <div key={item.id}>{inner}</div>;
                const isExt = item.href.startsWith("http");
                if (isExt) return <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>;
                return <Link key={item.id} href={item.href} className="block">{inner}</Link>;
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}


interface Advisory { label: string; detail: string; href: string }

function buildNextActions(snap: GlobalReadinessSnapshot, ts: Record<FoundationTool, ToolState>): Advisory[] {
  const actions: Advisory[] = [];
  const blockers = snap.red_flags.filter(f => f.blocking);
  for (const b of blockers.slice(0, 2)) actions.push({ label: b.action, detail: b.reason, href: b.href ?? "#" });

  const highWeightMissing = (["metrics", "qa", "valuation", "pitch"] as FoundationTool[]).filter(t => ts[t].score === 0);
  const toFill = Math.max(0, 3 - actions.length);
  for (const t of highWeightMissing.slice(0, toFill)) {
    actions.push({
      label: `Complete ${TOOL_LABELS[t]}`,
      detail: `${TOOL_LABELS[t]} carries ${Math.round(WEIGHTS[t] * 100)}% of your score and hasn't been started.`,
      href: TOOL_HREFS[t],
    });
  }
  if (snap.overall_score >= 70 && ts.dataroom.score === 0 && actions.length < 3) {
    actions.push({ label: "Prepare your data room", detail: "At your score level, investors will ask for documents. Be ready.", href: "/dataroom" });
  }
  if (snap.overall_score >= 75 && actions.length < 3) {
    actions.push({ label: "Book a readiness review", detail: "Your score is strong. Get expert feedback before starting outreach.", href: CALENDLY_URL });
  }
  return actions.slice(0, 4);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(
  snap: GlobalReadinessSnapshot,
  profile: FounderStartupProfile,
  toolStates: Record<FoundationTool, ToolState>
): Promise<void> {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const W = 210, PL = 20, PR = 190;
    let y = 20;

    const line = (text: string, size = 11, bold = false, color: [number, number, number] = [14, 14, 12]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.text(text, PL, y);
      y += size * 0.45 + 2;
    };
    const gap = (n = 4) => { y += n; };
    const rule = () => {
      doc.setDrawColor(231, 227, 218);
      doc.line(PL, y, PR, y);
      y += 5;
    };

    // Header
    doc.setFillColor(15, 106, 70);
    doc.rect(0, 0, W, 28, "F");
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("VCReady — Investor Readiness Report", PL, 13);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, PL, 21);
    y = 38;

    // Startup + score
    line(profile.startup_name || "Unnamed Startup", 18, true);
    line(`${profile.founder_name || "—"}  ·  ${profile.country || "—"}  ·  ${profile.sector || "—"}  ·  ${profile.stage || "—"}`, 10, false, [107, 110, 102]);
    gap(3);
    line(`Readiness Score: ${snap.overall_score}/100  —  ${snap.verdict}`, 13, true);
    line(verdictConfig(snap.verdict).tagline, 10, false, [107, 110, 102]);
    gap(); rule();

    // Traction
    line("Traction", 12, true);
    gap(1);
    const trItems = [["ARR", fmtMoney(profile.arr)], ["MRR", fmtMoney(profile.mrr)], ["Growth", fmtPct(profile.growth_rate)], ["Runway", profile.runway > 0 ? `${Math.round(profile.runway)} mo` : "—"]];
    for (const [k, v] of trItems) { doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(14, 14, 12); doc.text(`${k}:`, PL, y); doc.setFont("helvetica", "bold"); doc.text(v, PL + 28, y); y += 6; }
    gap(); rule();

    // Valuation
    line("Valuation", 12, true);
    gap(1);
    line(`Estimated pre-money: ${fmtMoney(profile.estimated_valuation)}`, 10);
    line(`Stage: ${profile.stage || "—"}`, 10);
    gap(); rule();

    // Tool scores
    line("Tool Scores", 12, true);
    gap(1);
    for (const [t, st] of Object.entries(toolStates) as [FoundationTool, ToolState][]) {
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(14, 14, 12);
      doc.text(`${TOOL_LABELS[t]}:`, PL, y);
      doc.setFont("helvetica", "bold");
      const sc = st.score;
      if (sc >= 70) doc.setTextColor(15, 106, 70);
      else if (sc >= 35) doc.setTextColor(138, 107, 31);
      else doc.setTextColor(140, 67, 67);
      doc.text(`${sc}/100`, PL + 40, y);
      doc.setTextColor(14, 14, 12);
      doc.setFont("helvetica", "normal");
      doc.text(st.status === "not_started" ? "Not started" : st.status === "in_progress" ? "In progress" : "Completed", PL + 65, y);
      y += 6;
    }
    gap(); rule();

    // Critical gaps
    const blockers = snap.red_flags.filter(f => f.blocking);
    const warnings = snap.red_flags.filter(f => !f.blocking);
    if (snap.red_flags.length > 0) {
      line("Critical Gaps", 12, true);
      gap(1);
      for (const f of blockers) {
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(140, 67, 67);
        doc.text(`[BLOCKER] ${f.label}`, PL, y); y += 5;
        doc.setFont("helvetica", "normal"); doc.setTextColor(107, 110, 102);
        const lines = doc.splitTextToSize(f.reason, 155) as string[];
        doc.text(lines, PL + 4, y); y += lines.length * 5;
      }
      for (const f of warnings) {
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(138, 107, 31);
        doc.text(`[WARNING] ${f.label}`, PL, y); y += 5;
        doc.setFont("helvetica", "normal"); doc.setTextColor(107, 110, 102);
        const lines = doc.splitTextToSize(f.reason, 155) as string[];
        doc.text(lines, PL + 4, y); y += lines.length * 5;
      }
      gap(); rule();
    }

    // Next actions
    const actions = buildNextActions(snap, toolStates);
    if (actions.length > 0) {
      line("Recommended Next Actions", 12, true);
      gap(1);
      for (let i = 0; i < actions.length; i++) {
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(14, 14, 12);
        doc.text(`${i + 1}. ${actions[i].label}`, PL, y); y += 5;
        doc.setFont("helvetica", "normal"); doc.setTextColor(107, 110, 102);
        const lines = doc.splitTextToSize(actions[i].detail, 155) as string[];
        doc.text(lines, PL + 4, y); y += lines.length * 5;
      }
    }

    // Footer
    doc.setFontSize(8); doc.setTextColor(175, 172, 165); doc.setFont("helvetica", "normal");
    doc.text("VCReady · vcready.com · Confidential", PL, 285);
    doc.text(`Score: ${snap.overall_score}/100`, 160, 285);

    doc.save(`${(profile.startup_name || "vcready").replace(/\s+/g, "-").toLowerCase()}-readiness-report.pdf`);
  } catch (err) {
    console.error("[PDF export]", err);
    window.print();
  }
}

// ─── getResumeStep ────────────────────────────────────────────────────────────

function getResumeStep(ts: Record<FoundationTool, ToolState>): { id: FlowStepId; href: string; label: string } | null {
  const done = getCompletedSteps();
  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    if (ts[step.id as FoundationTool]?.status === "in_progress" && !done.includes(step.id)) return step;
  }
  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    if (ts[step.id as FoundationTool]?.status === "not_started") return step;
  }
  return null;
}

// ─── You vs Market ────────────────────────────────────────────────────────────

/** Map profile free-text sectors (from onboarding) → comparables sector keys */
const SECTOR_NORMALIZE: Record<string, string> = {
  // Core Software
  "ai / machine learning": "deeptech",
  "saas / b2b software": "saas",
  "developer tools & apis": "saas",
  "developer tools": "saas",
  "cybersecurity": "saas",
  "data & analytics": "saas",
  "cloud infrastructure": "saas",
  "no-code / low-code": "saas",
  // Financial Services
  "fintech / payments": "fintech",
  "fintech": "fintech",
  "crypto / web3 / defi": "fintech",
  "crypto / web3": "fintech",
  "insurtech": "fintech",
  "regtech / compliance": "fintech",
  "regtech": "fintech",
  "wealthtech / investment": "fintech",
  "wealthtech": "fintech",
  // Health & Life Sciences
  "healthtech / digital health": "healthtech",
  "healthtech": "healthtech",
  "biotech / life sciences": "healthtech",
  "medtech / medical devices": "healthtech",
  "mental health & wellness": "healthtech",
  // Commerce & Marketplace
  "e-commerce / d2c": "retail",
  "e-commerce": "retail",
  "retail tech": "retail",
  "retail": "retail",
  "marketplace": "marketplace",
  // Consumer & Media
  "consumer app": "marketplace",
  "gaming / entertainment": "saas",
  "media & content": "saas",
  "sports & fitness": "healthtech",
  // Education & Future of Work
  "edtech": "edtech",
  "hrtech / future of work": "saas",
  "legaltech": "saas",
  // Real World & Physical
  "proptech / real estate": "saas",
  "logistics / supply chain": "logistics",
  "logistics": "logistics",
  "mobility & transportation": "logistics",
  "automotive tech": "logistics",
  "foodtech & restaurant tech": "agritech",
  "foodtech": "agritech",
  "agritech / farmtech": "agritech",
  "agritech": "agritech",
  "traveltech & hospitality": "travel",
  "traveltech": "travel",
  "travel": "travel",
  // Deep Tech & Hardware
  "deeptech": "deeptech",
  "cleantech / climate": "cleantech",
  "cleantech": "cleantech",
  "energy & renewables": "energy",
  "energy": "energy",
  "spacetech": "deeptech",
  "hardware / iot": "deeptech",
  "robotics & automation": "deeptech",
  "robotics / automation": "deeptech",
  // Infrastructure & Gov
  "govtech / civictech": "saas",
  "telecom / connectivity": "telecom",
  "telecom": "telecom",
};

/** Map profile stage labels (from onboarding) → comparables stage keys */
const STAGE_NORMALIZE: Record<string, string> = {
  "pre-seed": "preSeed",
  "seed": "seed",
  "series a": "seriesA",
  "series b+": "seriesB",
  "series b": "seriesB",
  "series c": "seriesC",
};

/** Stages that count as "adjacent" to a given stage for broadening the peer set */
const STAGE_ADJACENT: Record<string, string[]> = {
  preSeed:  ["preSeed", "seed"],
  seed:     ["preSeed", "seed", "seriesA"],
  seriesA:  ["seed", "seriesA", "seriesB"],
  seriesB:  ["seriesA", "seriesB", "seriesC"],
  seriesC:  ["seriesB", "seriesC", "seriesD"],
};

/** Human-readable stage labels used in YouVsMarketCard scope label */
const STAGE_NORMALIZE_LABEL: Record<string, string> = {
  preSeed: "Pre-Seed", seed: "Seed", seriesA: "Series A",
  seriesB: "Series B", seriesC: "Series C", seriesD: "Series D",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardV2Page() {
  const [snap, setSnap] = useState<GlobalReadinessSnapshot | null>(null);
  const [ts, setTs] = useState<Record<FoundationTool, ToolState> | null>(null);
  const [profile, setProfile] = useState<FounderStartupProfile | null>(null);
  const [history, setHistory] = useState<GlobalReadinessSnapshot[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackedView = useRef(false);

  // ── Animated counters ────────────────────────────────────────────────────────
  const animatedScore    = useCountUp(snap?.overall_score          ?? 0, 850);
  const animatedTools    = useCountUp(snap?.completed_tools_count  ?? 0, 500);
  const animatedBlockers = useCountUp(snap?.blockers_count         ?? 0, 400);
  const animatedProfile  = useCountUp(snap?.profile_completion_pct ?? 0, 700);
  const animatedARR      = useCountUp(profile?.arr                 ?? 0, 950);
  const animatedMRR      = useCountUp(profile?.mrr                 ?? 0, 950);
  const animatedVal      = useCountUp(profile?.estimated_valuation ?? 0, 1050);

  useEffect(() => {
    (async () => {
      try {
        const [globalSnap, hist] = await Promise.all([
          computeGlobalReadiness(),   // hydrates localStorage from DB as side-effect
          loadSnapshotHistory(),
        ]);
        // After DB hydration, read sync functions — no extra round-trip
        const toolStates = getLocalToolStates();
        const freshProfile = refreshUnifiedProfile();
        setSnap(globalSnap);
        setTs(toolStates);
        setProfile(freshProfile);
        setHistory(hist);
        saveSnapshot(globalSnap);
        if (!trackedView.current) {
          trackedView.current = true;
          track("dashboard_viewed", {
            score: globalSnap.overall_score,
            verdict: globalSnap.verdict,
            completed_tools_count: globalSnap.completed_tools_count,
            stage: freshProfile.stage,
            sector: freshProfile.sector,
            country: freshProfile.country,
          });
        }
      } catch (err) {
        console.error("[dashboard-v2]", err);
        try {
          const toolStates = getLocalToolStates();
          const freshProfile = refreshUnifiedProfile();
          const redFlags = getReadinessRedFlags(toolStates);
          const overall = Math.round(
            (Object.entries(toolStates) as [FoundationTool, ToolState][]).reduce((sum, [t, s]) => sum + s.score * WEIGHTS[t], 0)
          );
          const fallback: GlobalReadinessSnapshot = {
            overall_score: overall,
            verdict: getGlobalVerdict(overall, redFlags),
            blockers_count: redFlags.filter(f => f.blocking).length,
            red_flags: redFlags,
            source_scores: { metrics: toolStates.metrics.score, valuation: toolStates.valuation.score, qa: toolStates.qa.score, captable: toolStates.captable.score, pitch: toolStates.pitch.score, dataroom: toolStates.dataroom.score },
            profile_completion_pct: getProfileCompletionPct({ ...freshProfile, overall_score: overall }),
            strongest_tool: (Object.entries(toolStates) as [FoundationTool, ToolState][]).sort((a, b) => b[1].score - a[1].score).find(([, s]) => s.score > 0)?.[0] ?? null,
            weakest_tool: (Object.entries(toolStates) as [FoundationTool, ToolState][]).sort((a, b) => a[1].score - b[1].score).find(([, s]) => s.score < 70)?.[0] ?? null,
            missing_tools: (Object.entries(toolStates) as [FoundationTool, ToolState][]).filter(([, s]) => s.score === 0).map(([t]) => t),
            completed_tools_count: Object.values(toolStates).filter(s => s.score > 0).length,
            saved_at: new Date().toISOString(),
          };
          setSnap(fallback); setTs(toolStates); setProfile(freshProfile);
          setHistory(getSnapshotHistory());
          saveSnapshot(fallback);
        } catch (e2) { setError(e2 instanceof Error ? e2.message : "unknown error"); }
      }
    })();
  }, []);

  const handleExport = useCallback(async () => {
    if (!snap || !profile || !ts || exporting) return;
    track("pdf_export_clicked", { score: snap.overall_score, verdict: snap.verdict });
    setExporting(true);
    try { await exportPDF(snap, profile, ts); }
    finally { setExporting(false); }
  }, [snap, profile, ts, exporting]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="py-8"><Container>
      <div className="rounded-[var(--radius-lg)] border border-danger/20 bg-danger/5 p-6">
        <p className="text-sm font-bold text-danger">Something went wrong</p>
        <p className="text-sm text-ink-secondary mt-1">{error}</p>
      </div>
    </Container></div>
  );

  if (!snap || !ts || !profile) return (
    <div className="py-8"><Container>
      <div className="space-y-4">
        <div className="animate-pulse h-48 rounded-[var(--radius-lg)] bg-soft border border-border" />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="animate-pulse h-44 rounded-[var(--radius-lg)] bg-soft border border-border" />
          <div className="animate-pulse h-44 rounded-[var(--radius-lg)] bg-soft border border-border" />
        </div>
        <div className="animate-pulse h-32 rounded-[var(--radius-lg)] bg-soft border border-border" />
      </div>
    </Container></div>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (snap.completed_tools_count === 0) return (
    <div className="py-8"><Container>
      <Card padding="lg">
        <div className="flex flex-col items-center text-center py-10 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-soft border-2 border-border flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">Complete your first tool to unlock your score</h1>
          <p className="text-sm text-ink-secondary leading-relaxed mb-6">
            Your investor readiness score is calculated from 6 tools. Metrics carries 25% of the score — start here.
          </p>
          <Link href="/metrics"
            className="inline-flex items-center h-11 px-6 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
          >Start with Metrics →</Link>
        </div>
      </Card>
    </Container></div>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  const vc = verdictConfig(snap.verdict);
  const band = scoreBand(snap.overall_score);
  const nextStep = getResumeStep(ts);
  // Legacy helpers retained only for PDF export (buildNextActions)

  // ── Advisory inputs (mirrors YouVsMarketCard peer-set logic) ────────────────
  const _sectorKey = SECTOR_NORMALIZE[profile.sector?.toLowerCase() ?? ""] ?? null;
  const _stageKey  = STAGE_NORMALIZE[profile.stage?.toLowerCase()  ?? ""] ?? null;
  let _peers = COMPARABLES_DATA;
  if (_sectorKey) {
    const _adjStages   = _stageKey ? (STAGE_ADJACENT[_stageKey] ?? [_stageKey]) : null;
    const _bySectorStage = COMPARABLES_DATA.filter(d => d.sector === _sectorKey && (_adjStages ? _adjStages.includes(d.stage) : true));
    const _bySector      = COMPARABLES_DATA.filter(d => d.sector === _sectorKey);
    if (_bySectorStage.length >= 5) _peers = _bySectorStage;
    else if (_bySector.length >= 3) _peers = _bySector;
  }
  const _bm  = computeBenchmark(_peers);
  const _rawInvestment = (ts.valuation.inputs as { formData?: { investmentAmount?: number } })?.formData?.investmentAmount;
  const _yourRaisedM   = _rawInvestment ? _rawInvestment / 1_000_000 : null;
  const _yourValuationM = profile.estimated_valuation > 0 ? profile.estimated_valuation / 1_000_000 : null;
  const _yvm = compareToMarket(_yourRaisedM, _yourValuationM, _bm);

  const advisory = buildAdvisory({
    snap,
    profile,
    ts,
    benchmark:      _bm,
    yvm:            _yvm,
    yourRaisedM:    _yourRaisedM,
    yourValuationM: _yourValuationM,
  });

  // ── Derived positioning for intelligence band market panel ─────────────────
  const _scopeLabel = (() => {
    if (!_sectorKey) return "All markets";
    const adjStages = _stageKey ? (STAGE_ADJACENT[_stageKey] ?? [_stageKey]) : null;
    const bySS = COMPARABLES_DATA.filter(d => d.sector === _sectorKey && (adjStages ? adjStages.includes(d.stage) : true));
    const byS  = COMPARABLES_DATA.filter(d => d.sector === _sectorKey);
    if (bySS.length >= 5) {
      const sl = _sectorKey.charAt(0).toUpperCase() + _sectorKey.slice(1);
      const tl = _stageKey ? (STAGE_NORMALIZE_LABEL[_stageKey] ?? _stageKey) : "";
      return `${sl}${tl ? ` · ${tl}` : ""}`;
    }
    if (byS.length >= 3) return _sectorKey.charAt(0).toUpperCase() + _sectorKey.slice(1);
    return "All markets";
  })();

  const _posInfo = (() => {
    if (_yvm.raisedVsMedian !== "unknown") {
      if (_yvm.raisedVsP75 === "above")
        return { label: "Aggressive", color: "text-warning", desc: "Your raise is above the P75 for comparable deals." };
      if (_yvm.raisedVsMedian === "above")
        return { label: "Above median", color: "text-success", desc: "Raise target is above market median." };
      if (_yvm.raisedVsMedian === "at")
        return { label: "In range", color: "text-success", desc: "Raise target aligns with the market median." };
      return { label: "Conservative", color: "text-ink-secondary", desc: "Raise target is below the market median." };
    }
    if (_yvm.valuationVsMedian !== "unknown") {
      if (_yvm.valuationVsMedian === "above")
        return { label: "Above median", color: "text-success", desc: "Valuation is above the peer median." };
      if (_yvm.valuationVsMedian === "below")
        return { label: "Below median", color: "text-ink-secondary", desc: "Valuation is below the peer median." };
      return { label: "In range", color: "text-success", desc: "Valuation is in line with the peer median." };
    }
    return { label: "No data", color: "text-muted", desc: "Complete the Valuation tool to unlock market positioning." };
  })();

  return (
    <div className="py-8 bg-background min-h-screen">
      <Container>
        <div className="space-y-5">

          {/* ─── 1. HERO — dark command center ───────────────────────────── */}
          <div className="rounded-[var(--radius-lg)] bg-ink overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-4">

                {/* Score arc */}
                <ScoreArc score={animatedScore} colorScore={snap.overall_score} size={88} dark />

                {/* Identity + actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                      {profile.startup_name || "Your startup"}
                    </h1>
                    <span className={`inline-flex items-center h-5 px-2 rounded border text-[10px] font-bold ${vc.badge}`}>
                      {snap.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-white/55 mb-2 leading-snug">
                    {(() => {
                      const flag = profile.country ? getCountryFlag(profile.country) : "";
                      const countryDisplay = profile.country ? (flag ? `${flag} ${profile.country}` : profile.country) : "";
                      return [profile.founder_name, countryDisplay, profile.sector, profile.stage].filter(Boolean).join(" · ") || "Complete your profile";
                    })()}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {nextStep ? (
                      <Link href={nextStep.href}
                        className="inline-flex items-center h-8 px-3 rounded-[var(--radius-md)] bg-white text-ink text-xs font-bold hover:bg-white/90 transition-colors"
                      >Continue: {nextStep.label} →</Link>
                    ) : (
                      <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center h-8 px-3 rounded-[var(--radius-md)] bg-white text-ink text-xs font-bold hover:bg-white/90 transition-colors"
                        onClick={() => track("expert_meeting_cta_clicked", { score: snap?.overall_score, verdict: snap?.verdict, location: "hero" })}
                      >Book readiness review →</a>
                    )}
                    <button onClick={handleExport} disabled={exporting}
                      className="inline-flex items-center h-8 px-3 rounded-[var(--radius-md)] border border-white/20 text-white/70 text-xs font-medium hover:border-white/40 transition-colors disabled:opacity-50"
                    >{exporting ? "Generating…" : "↓ PDF"}</button>
                    <Link href="/onboard"
                      className="inline-flex items-center h-8 px-3 rounded-[var(--radius-md)] border border-white/20 text-white/70 text-xs font-medium hover:border-white/40 transition-colors"
                    >Edit profile</Link>
                  </div>
                </div>

                {/* Stat chips — compact vertical */}
                <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-white/10 border border-white/12 rounded-[var(--radius-md)] px-3 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-white/50 font-semibold w-9">Tools</p>
                    <p className="text-sm font-black font-mono text-white">{animatedTools}<span className="text-xs font-normal text-white/40">/6</span></p>
                  </div>
                  <div className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 border ${snap.blockers_count > 0 ? "bg-danger/20 border-danger/30" : "bg-white/10 border-white/12"}`}>
                    <p className="text-[10px] uppercase tracking-wide text-white/50 font-semibold w-9">Gaps</p>
                    <p className={`text-sm font-black font-mono ${snap.blockers_count > 0 ? "text-danger" : "text-white"}`}>{animatedBlockers}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 border border-white/12 rounded-[var(--radius-md)] px-3 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-white/50 font-semibold w-9">Done</p>
                    <p className="text-sm font-black font-mono text-white">{animatedProfile}<span className="text-xs font-normal text-white/40">%</span></p>
                  </div>
                </div>
              </div>

              {/* Mobile stat strip */}
              <div className="sm:hidden flex gap-2 mt-3">
                {[
                  { label: "Tools", value: `${animatedTools}/6`, warn: false },
                  { label: "Gaps",  value: `${animatedBlockers}`, warn: snap.blockers_count > 0 },
                  { label: "Done",  value: `${animatedProfile}%`, warn: false },
                ].map(s => (
                  <div key={s.label} className={`flex-1 rounded-[var(--radius-md)] border px-2 py-1.5 text-center ${s.warn ? "bg-danger/20 border-danger/30" : "bg-white/10 border-white/12"}`}>
                    <p className="text-[9px] uppercase tracking-wide text-white/40 font-semibold">{s.label}</p>
                    <p className={`text-sm font-black font-mono ${s.warn ? "text-danger" : "text-white"}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Score bar */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-white/50">Investor readiness</span>
                  <span className={`font-bold ${band.text}`}>{snap.overall_score}/100 · {snap.verdict}</span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${vc.bar}`} style={{ width: `${snap.overall_score}%` }} />
                  {[35, 60, 80].map(v => (
                    <div key={v} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${v}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-white/25 mt-1">
                  <span>Early</span><span>35</span><span>60</span><span>80 — Strong</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. INTELLIGENCE BAND — traction · valuation · market ────── */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">

              {/* Traction */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">Traction</p>
                  {ts.metrics.score > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-14 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBand(ts.metrics.score).bg}`} style={{ width: `${ts.metrics.score}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${scoreBand(ts.metrics.score).text}`}>{ts.metrics.score}/100</span>
                    </div>
                  ) : (
                    <Link href="/metrics" className="text-[10px] text-accent font-semibold hover:underline">Complete →</Link>
                  )}
                </div>
                {profile.mrr === 0 && profile.arr === 0 ? (
                  <div className="py-3 text-center">
                    <p className="text-xs text-muted mb-2">No traction data yet</p>
                    <Link href="/metrics" className="text-xs font-bold text-accent hover:underline">Complete Metrics →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-[10px] text-muted font-semibold mb-0.5">ARR</p>
                      <p className={`text-base font-extrabold font-mono leading-none ${profile.arr >= 240_000 ? "text-success" : profile.arr > 0 ? "text-warning" : "text-muted"}`}>{fmtMoney(animatedARR)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted font-semibold mb-0.5">MRR</p>
                      <p className={`text-base font-extrabold font-mono leading-none ${profile.mrr >= 20_000 ? "text-success" : profile.mrr > 0 ? "text-warning" : "text-muted"}`}>{fmtMoney(animatedMRR)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted font-semibold mb-0.5">Growth</p>
                      <p className={`text-base font-extrabold font-mono leading-none ${profile.growth_rate >= 15 ? "text-success" : profile.growth_rate >= 5 ? "text-warning" : profile.growth_rate > 0 ? "text-danger" : "text-muted"}`}>{fmtPct(profile.growth_rate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted font-semibold mb-0.5">Runway</p>
                      <p className={`text-base font-extrabold font-mono leading-none ${profile.runway >= 18 ? "text-success" : profile.runway >= 9 ? "text-warning" : profile.runway > 0 ? "text-danger" : "text-muted"}`}>{profile.runway > 0 ? `${Math.round(profile.runway)} mo` : "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Valuation */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">Valuation</p>
                  {ts.valuation.score > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-14 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBand(ts.valuation.score).bg}`} style={{ width: `${ts.valuation.score}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${scoreBand(ts.valuation.score).text}`}>{ts.valuation.score}/100</span>
                    </div>
                  ) : (
                    <Link href="/valuation" className="text-[10px] text-accent font-semibold hover:underline">Complete →</Link>
                  )}
                </div>
                {profile.estimated_valuation === 0 ? (
                  <div className="py-3 text-center">
                    <p className="text-xs text-muted mb-2">No valuation data yet</p>
                    <Link href="/valuation" className="text-xs font-bold text-accent hover:underline">Run Valuation →</Link>
                  </div>
                ) : (
                  <>
                    <p className={`text-3xl font-black font-mono leading-none mb-1 ${scoreBand(ts.valuation.score).text}`}>{fmtMoney(animatedVal)}</p>
                    <p className="text-xs text-muted mb-3">Estimated pre-money</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-muted font-semibold">Stage</p>
                        <p className="text-xs font-bold text-ink">{profile.stage || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted font-semibold">Sector</p>
                        <p className="text-xs font-bold text-ink truncate max-w-[110px]">{profile.sector || "—"}</p>
                      </div>
                    </div>
                  </>
                )}
                <Link href="/valuation" className="text-[10px] text-accent font-semibold hover:underline mt-3 inline-block">Update →</Link>
              </div>

              {/* Market position */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">Market position</p>
                  <Link href="/comparables" className="text-[10px] text-accent font-semibold hover:underline">Explorer →</Link>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className={`text-2xl font-black leading-none ${_posInfo.color}`}>{_posInfo.label}</p>
                  {_yvm.raisedPercentile !== null && (
                    <span className="text-xs text-muted font-semibold">P{_yvm.raisedPercentile}</span>
                  )}
                </div>
                <p className="text-xs text-ink-secondary mb-3 leading-snug">{_posInfo.desc}</p>
                <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">Raise distribution · {_scopeLabel}</p>
                  <RangeBar p25={_bm.p25Raised} median={_bm.medianRaised} p75={_bm.p75Raised} you={_yourRaisedM} label="Your target" />
                </div>
                <p className="text-[10px] text-muted mt-2">{_bm.peerCount} comparable deals · {_bm.confidence} confidence</p>
              </div>

            </div>
          </div>

          {/* ─── 3. CRITICAL ALERTS ──────────────────────────────────────── */}
          {snap.red_flags.length > 0 && (
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Action needed">Critical alerts</CardTitle>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${snap.blockers_count > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                  {snap.red_flags.length} {snap.red_flags.length === 1 ? "issue" : "issues"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {snap.red_flags.map(f => <AlertCard key={f.id} flag={f} />)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── 4. UNIFIED ADVISORY PANEL ───────────────────────────────── */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-extrabold tracking-tight text-ink">Fundraising advisor</h2>
                {advisory.data_completeness !== "full" && (
                  <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 rounded px-2 py-0.5">
                    {advisory.data_completeness === "minimal" ? "Minimal data" : "Partial data"}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted font-medium">Rule-based · updated in real-time</span>
            </div>

            <div className="grid lg:grid-cols-[3fr_2fr] divide-y lg:divide-y-0 lg:divide-x divide-border">

              {/* Left: Summary + Strategy + CTAs + Investor challenges */}
              <div className="p-5 space-y-5">

                {/* Readiness summary */}
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em] mb-2">Advisor summary</p>
                  <div className="border-l-[3px] border-accent pl-4">
                    <p className="text-sm text-ink-secondary leading-relaxed">{advisory.readiness_summary}</p>
                  </div>
                </div>

                {/* Strategy */}
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em] mb-2">What to do this week</p>
                  <div className="bg-accent/5 border border-accent/20 rounded-[var(--radius-md)] p-4">
                    <p className="text-sm font-semibold text-ink leading-relaxed">{advisory.recommended_strategy}</p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-2">
                  {advisory.primary_cta.ext ? (
                    <a href={advisory.primary_cta.href} target="_blank" rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                    >{advisory.primary_cta.label}</a>
                  ) : (
                    <Link href={advisory.primary_cta.href}
                      className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                    >{advisory.primary_cta.label}</Link>
                  )}
                  {advisory.secondary_cta && (
                    advisory.secondary_cta.ext ? (
                      <a href={advisory.secondary_cta.href} target="_blank" rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                      >{advisory.secondary_cta.label}</a>
                    ) : (
                      <Link href={advisory.secondary_cta.href}
                        className="w-full inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                      >{advisory.secondary_cta.label}</Link>
                    )
                  )}
                </div>

                {/* Investor challenges */}
                {advisory.investor_challenges.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em] mb-2">What investors will challenge</p>
                    <div className="space-y-2">
                      {advisory.investor_challenges.map(item => (
                        <AdvisoryItemRow key={item.id} item={item} variant="challenge" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Top priorities + Next actions */}
              <div className="bg-soft p-5 space-y-5">

                {/* Top priorities */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">Top priorities</p>
                    <span className="text-[10px] text-muted">By impact</span>
                  </div>
                  {advisory.top_priorities.length === 0 ? (
                    <p className="text-xs font-semibold text-success">No critical priorities — profile looks solid.</p>
                  ) : (
                    <div className="space-y-2">
                      {advisory.top_priorities.map((item, i) => {
                        const sev = item.severity ?? "medium";
                        const cfg = SEVERITY_CONFIG[sev];
                        const inner = (
                          <div className={`rounded-[var(--radius-md)] border p-3 flex items-start gap-3 transition-colors ${cfg.bg} ${item.href ? "hover:border-ink/20" : ""}`}>
                            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-ink leading-snug">{item.label}</p>
                              <p className="text-[10px] text-ink-secondary leading-relaxed mt-0.5">{item.detail}</p>
                            </div>
                            {item.href && <span className="text-[10px] font-bold text-accent shrink-0 mt-0.5">Go →</span>}
                          </div>
                        );
                        if (!item.href) return <div key={item.id}>{inner}</div>;
                        const isExt = item.href.startsWith("http");
                        if (isExt) return <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
                        return <Link key={item.id} href={item.href}>{inner}</Link>;
                      })}
                    </div>
                  )}
                </div>

                {/* Next actions */}
                {advisory.next_actions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em] mb-3">Next actions</p>
                    <div className="space-y-2">
                      {advisory.next_actions.map((item, i) => {
                        const sev = item.severity ?? "medium";
                        const cfg = SEVERITY_CONFIG[sev];
                        const inner = (
                          <div className={`rounded-[var(--radius-md)] border p-3 flex items-start gap-3 transition-colors ${cfg.bg} ${item.href ? "hover:border-ink/20" : ""}`}>
                            <span className="w-5 h-5 rounded-full bg-soft border border-border text-ink text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-ink leading-snug">{item.label}</p>
                              {item.href && <span className="text-[10px] font-bold text-accent mt-0.5 block">{item.href.startsWith("http") ? "Open →" : "Go →"}</span>}
                            </div>
                          </div>
                        );
                        if (!item.href) return <div key={item.id}>{inner}</div>;
                        const isExt = item.href.startsWith("http");
                        if (isExt) return <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
                        return <Link key={item.id} href={item.href}>{inner}</Link>;
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ─── 5. TOOL BAR — compact horizontal list ───────────────────── */}
          <Card padding="none">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-[0.14em]">Assessment modules</p>
              </div>
              <span className="text-xs text-muted">{snap.completed_tools_count}/6 completed</span>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-[16px_1fr_80px_36px_36px_60px_28px] items-center gap-3 px-4 py-2 border-b border-border bg-soft">
              <span />
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Tool</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Score</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide text-right">Pts</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide text-right">Wt.</span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Status</span>
              <span />
            </div>
            {(Object.keys(ts) as FoundationTool[]).map(t => <ToolRow key={t} tool={t} state={ts[t]} />)}
          </Card>

          {/* ─── 6. BOTTOM ROW — progress + expert CTA ───────────────────── */}
          {(() => {
            const sorted = [...history].sort(
              (a, b) => new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime()
            );
            const scores = sorted.map(h => h.overall_score);
            const best = scores.length > 0 ? Math.max(...scores) : snap.overall_score;
            const prev = sorted.length >= 2 ? sorted[sorted.length - 2].overall_score : null;
            const delta = prev !== null ? snap.overall_score - prev : null;
            const firstSeen = sorted.length > 0 ? sorted[0].saved_at : null;
            const lastSeen  = sorted.length > 0 ? sorted[sorted.length - 1].saved_at : null;
            const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

            return (
              <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">

                {/* Progress */}
                <Card padding="sm">
                  <CardHeader>
                    <CardTitle kicker="Progress">Score over time</CardTitle>
                    {history.length > 0 && (
                      <span className="text-xs text-muted">{history.length} {history.length === 1 ? "snapshot" : "snapshots"}</span>
                    )}
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <div className="py-5 text-center">
                        <p className="text-sm font-semibold text-muted mb-1">No history yet</p>
                        <p className="text-xs text-muted">Your score is recorded each time you save a tool.</p>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">Current</p>
                            <p className={`text-xl font-extrabold font-mono ${scoreBand(snap.overall_score).text}`}>{snap.overall_score}</p>
                          </div>
                          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">Best ever</p>
                            <p className={`text-xl font-extrabold font-mono ${scoreBand(best).text}`}>{best}</p>
                          </div>
                          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">vs Previous</p>
                            <p className={`text-xl font-extrabold font-mono ${delta === null ? "text-muted" : delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"}`}>
                              {delta === null ? "—" : delta > 0 ? `+${delta}` : delta === 0 ? "→" : `${delta}`}
                            </p>
                          </div>
                          <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">Last saved</p>
                            <p className="text-xs font-semibold text-ink leading-snug mt-1">{lastSeen ? fmtDate(lastSeen) : "—"}</p>
                          </div>
                        </div>
                        {scores.length >= 3 ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Score trend</span>
                              <span className={`text-xs font-bold ${trend > 0 ? "text-success" : trend < 0 ? "text-danger" : "text-muted"}`}>
                                {trend > 0 ? `↑ Improving (+${trend} total)` : trend < 0 ? `↓ Declining (${trend} total)` : "→ Stable"}
                              </span>
                            </div>
                            <div className="bg-soft border border-border rounded-[var(--radius-md)] px-3 pt-3 pb-2">
                              <Sparkline data={scores} />
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[10px] text-muted">{firstSeen ? fmtDateShort(firstSeen) : ""}</span>
                                <span className="text-[10px] text-muted">{lastSeen ? fmtDateShort(lastSeen) : ""}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-soft border border-border rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-border flex-shrink-0" />
                            <p className="text-xs text-muted">
                              {scores.length === 1
                                ? "Save more tools to start tracking your progress chart."
                                : "One more save will unlock your progress chart."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Expert CTA */}
                <div className="rounded-[var(--radius-lg)] bg-ink overflow-hidden">
                  <div className="px-5 py-6 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-bold text-white/50 uppercase tracking-[0.14em] mb-2">Expert session</p>
                      <p className="text-base font-bold text-white leading-snug mb-1">Get expert guidance on your fundraising</p>
                      <p className="text-xs text-white/55 leading-relaxed">
                        30-minute session with a VCReady expert — review your score, validate your strategy, and get actionable feedback before investor meetings.
                      </p>
                    </div>
                    <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 px-5 rounded-[var(--radius-md)] bg-white text-ink text-sm font-bold hover:bg-white/90 transition-colors"
                      onClick={() => track("expert_meeting_cta_clicked", { score: snap?.overall_score, verdict: snap?.verdict, location: "bottom_cta" })}
                    >Book a meeting →</a>
                    <div className="flex gap-2 pt-1 border-t border-white/10">
                      <button onClick={handleExport} disabled={exporting}
                        className="flex-1 h-8 px-3 rounded-[var(--radius-md)] border border-white/20 text-white/70 text-xs font-semibold hover:border-white/40 transition-colors disabled:opacity-50"
                      >{exporting ? "Generating…" : "↓ Export PDF"}</button>
                      <Link href="/onboard"
                        className="flex-1 h-8 px-3 rounded-[var(--radius-md)] border border-white/20 text-white/70 text-xs font-semibold hover:border-white/40 transition-colors flex items-center justify-center"
                      >Edit profile</Link>
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      </Container>
    </div>
  );
}
