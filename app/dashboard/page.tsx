"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/section";
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

const FLAG_MAP: Record<string, string> = {
  // ISO 2-letter codes
  "us": "🇺🇸", "gb": "🇬🇧", "fr": "🇫🇷", "de": "🇩🇪", "ca": "🇨🇦", "au": "🇦🇺",
  "in": "🇮🇳", "br": "🇧🇷", "sg": "🇸🇬", "ae": "🇦🇪", "nl": "🇳🇱", "se": "🇸🇪",
  "ch": "🇨🇭", "es": "🇪🇸", "it": "🇮🇹", "jp": "🇯🇵", "cn": "🇨🇳", "kr": "🇰🇷",
  "il": "🇮🇱", "ng": "🇳🇬", "za": "🇿🇦", "mx": "🇲🇽", "ar": "🇦🇷", "co": "🇨🇴",
  "ke": "🇰🇪", "eg": "🇪🇬", "pk": "🇵🇰", "id": "🇮🇩", "tr": "🇹🇷", "ma": "🇲🇦",
  "pt": "🇵🇹", "ie": "🇮🇪", "dk": "🇩🇰", "fi": "🇫🇮", "no": "🇳🇴", "pl": "🇵🇱",
  "nz": "🇳🇿", "ru": "🇷🇺", "ua": "🇺🇦", "gh": "🇬🇭", "tn": "🇹🇳", "be": "🇧🇪",
  "at": "🇦🇹", "cz": "🇨🇿", "ro": "🇷🇴", "hu": "🇭🇺", "gr": "🇬🇷", "rs": "🇷🇸",
  "sa": "🇸🇦", "qa": "🇶🇦", "kw": "🇰🇼", "bh": "🇧🇭", "jo": "🇯🇴", "lb": "🇱🇧",
  "th": "🇹🇭", "vn": "🇻🇳", "ph": "🇵🇭", "my": "🇲🇾", "bd": "🇧🇩", "lk": "🇱🇰",
  "cl": "🇨🇱", "pe": "🇵🇪", "uy": "🇺🇾", "ec": "🇪🇨", "ve": "🇻🇪", "cr": "🇨🇷",
  "tz": "🇹🇿", "ug": "🇺🇬", "et": "🇪🇹", "ci": "🇨🇮", "sn": "🇸🇳", "cm": "🇨🇲",
  // Country names (as typed in free-text fields)
  "united states": "🇺🇸", "united states of america": "🇺🇸", "usa": "🇺🇸", "u.s.a.": "🇺🇸",
  "united kingdom": "🇬🇧", "uk": "🇬🇧", "england": "🇬🇧", "britain": "🇬🇧", "great britain": "🇬🇧",
  "france": "🇫🇷", "germany": "🇩🇪", "canada": "🇨🇦", "australia": "🇦🇺",
  "india": "🇮🇳", "brazil": "🇧🇷", "singapore": "🇸🇬",
  "united arab emirates": "🇦🇪", "uae": "🇦🇪", "dubai": "🇦🇪",
  "netherlands": "🇳🇱", "holland": "🇳🇱", "sweden": "🇸🇪", "switzerland": "🇨🇭",
  "spain": "🇪🇸", "italy": "🇮🇹", "japan": "🇯🇵", "china": "🇨🇳",
  "south korea": "🇰🇷", "korea": "🇰🇷", "israel": "🇮🇱", "nigeria": "🇳🇬",
  "south africa": "🇿🇦", "mexico": "🇲🇽", "argentina": "🇦🇷", "colombia": "🇨🇴",
  "kenya": "🇰🇪", "egypt": "🇪🇬", "pakistan": "🇵🇰", "indonesia": "🇮🇩",
  "turkey": "🇹🇷", "türkiye": "🇹🇷", "morocco": "🇲🇦", "portugal": "🇵🇹",
  "ireland": "🇮🇪", "denmark": "🇩🇰", "finland": "🇫🇮", "norway": "🇳🇴",
  "poland": "🇵🇱", "new zealand": "🇳🇿", "russia": "🇷🇺", "ukraine": "🇺🇦",
  "ghana": "🇬🇭", "tunisia": "🇹🇳", "belgium": "🇧🇪", "austria": "🇦🇹",
  "czech republic": "🇨🇿", "czechia": "🇨🇿", "romania": "🇷🇴", "hungary": "🇭🇺",
  "greece": "🇬🇷", "serbia": "🇷🇸", "saudi arabia": "🇸🇦", "ksa": "🇸🇦",
  "qatar": "🇶🇦", "kuwait": "🇰🇼", "bahrain": "🇧🇭", "jordan": "🇯🇴", "lebanon": "🇱🇧",
  "thailand": "🇹🇭", "vietnam": "🇻🇳", "philippines": "🇵🇭", "malaysia": "🇲🇾",
  "bangladesh": "🇧🇩", "sri lanka": "🇱🇰", "chile": "🇨🇱", "peru": "🇵🇪",
};

function getCountryFlag(country: string): string {
  if (!country) return "";
  const flag = FLAG_MAP[country.trim().toLowerCase()];
  return flag ?? "";
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

function ScoreArc({ score, colorScore, size = 96 }: { score: number; colorScore?: number; size?: number }) {
  const sw = 9;
  const r = (size - sw * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { hex } = scoreBand(colorScore ?? score);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E7E3DA" strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={hex} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black font-mono leading-none">{score}</span>
        <span className="text-[10px] text-muted font-medium leading-none mt-0.5">/100</span>
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

// ─── Metric Stat chip ─────────────────────────────────────────────────────────

function MetricStat({ label, value, sub, tone = "neutral" }: {
  label: string; value: string; sub?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const color = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-danger" : "text-ink";
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted font-semibold mb-1">{label}</p>
      <p className={`text-lg font-extrabold font-mono leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

// ─── Mini tool card ───────────────────────────────────────────────────────────

function ToolCard({ tool, state }: { tool: FoundationTool; state: ToolState }) {
  const band = scoreBand(state.score);
  const dot = state.status === "completed" ? "bg-success" : state.status === "in_progress" ? "bg-warning" : "bg-border";
  return (
    <Link href={TOOL_HREFS[tool]}
      className="bg-card border border-border rounded-[var(--radius-md)] p-3 hover:border-ink/20 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-sm font-semibold text-ink">{TOOL_LABELS[tool]}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${band.text}`}>{state.score}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${state.score > 0 ? band.bg : "bg-border"}`}
          style={{ width: `${state.score}%` }} />
      </div>
      <p className="text-[11px] text-muted">
        {state.status === "not_started" ? "Not started" : state.status === "in_progress" ? "In progress" : "Completed"}
      </p>
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

// ─── Advisory engine ──────────────────────────────────────────────────────────

interface Advisory { label: string; detail: string; href?: string }

function buildStrengths(ts: Record<FoundationTool, ToolState>, p: FounderStartupProfile): Advisory[] {
  const out: Advisory[] = [];
  if (ts.metrics.score >= 70) {
    out.push({
      label: "Strong traction metrics",
      detail: p.mrr > 0 ? `MRR ${fmtMoney(p.mrr)} · ARR ${fmtMoney(p.arr)} · ${fmtPct(p.growth_rate)} growth` : "Operating metrics are above investor bar.",
      href: "/metrics",
    });
  }
  if (ts.valuation.score >= 70) {
    out.push({
      label: "Compelling valuation",
      detail: p.estimated_valuation > 0 ? `Estimated pre-money: ${fmtMoney(p.estimated_valuation)}` : "Valuation model is solid and defensible.",
      href: "/valuation",
    });
  }
  if (ts.qa.score >= 70) {
    out.push({ label: "Investor Q&A readiness", detail: "You can handle tough investor questions — a real differentiator in live meetings.", href: "/qa" });
  }
  if (ts.pitch.score >= 70) {
    out.push({ label: "Strong pitch narrative", detail: "Problem, traction, team and ask are covered at a high level.", href: "/pitch" });
  }
  if (ts.captable.score >= 70) {
    out.push({ label: "Clean cap table", detail: "Equity structure won't create diligence friction.", href: "/captable" });
  }
  if (ts.dataroom.score >= 70) {
    out.push({ label: "Data room ready", detail: "Diligence documents are organized — accelerates deal closure.", href: "/dataroom" });
  }
  return out;
}

function buildWeaknesses(ts: Record<FoundationTool, ToolState>, p: FounderStartupProfile): Advisory[] {
  const out: Advisory[] = [];
  if (ts.metrics.score > 0 && ts.metrics.score < 50) {
    out.push({
      label: "Traction needs work",
      detail: p.mrr === 0 ? "No MRR recorded. Investors need revenue before a Seed round." : `MRR ${fmtMoney(p.mrr)} is below typical investor expectations. Aim for $20K+ MRR.`,
      href: "/metrics",
    });
  }
  if (ts.qa.score > 0 && ts.qa.score < 50) {
    out.push({ label: "Investor Q&A is weak", detail: "Founders who struggle with investor questions lose deals. Prioritize this.", href: "/qa" });
  }
  if (ts.valuation.score > 0 && ts.valuation.score < 50) {
    out.push({ label: "Valuation model is thin", detail: "A weak valuation signals lack of financial fluency. Investors probe this hard.", href: "/valuation" });
  }
  if (ts.pitch.score > 0 && ts.pitch.score < 50) {
    out.push({ label: "Pitch has critical gaps", detail: "Key sections — team, traction, or the ask — are incomplete.", href: "/pitch" });
  }
  if (p.runway > 0 && p.runway < 9) {
    out.push({ label: `Runway at ${Math.round(p.runway)} months`, detail: "Fundraising under pressure weakens your negotiating position.", href: "/metrics" });
  }
  return out;
}

function buildNextActions(snap: GlobalReadinessSnapshot, ts: Record<FoundationTool, ToolState>): Advisory[] {
  const actions: Advisory[] = [];
  const blockers = snap.red_flags.filter(f => f.blocking);
  for (const b of blockers.slice(0, 2)) actions.push({ label: b.action, detail: b.reason, href: b.href });

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

function buildNarrative(snap: GlobalReadinessSnapshot, p: FounderStartupProfile): string {
  const name = p.startup_name || "Your startup";
  const stage = p.stage || "early stage";
  const s = snap.overall_score;
  const strongest = snap.strongest_tool ? TOOL_LABELS[snap.strongest_tool] : null;
  const weakest = snap.weakest_tool ? TOOL_LABELS[snap.weakest_tool] : null;

  if (s < 25) return `${name} is at the very start of its investor readiness journey. Complete Metrics and Q&A first — these two tools alone drive 45% of your score.`;
  if (snap.verdict === "Early") return `${name} has material gaps that would stop a deal early in diligence. ${weakest ? `The most important area to fix is ${weakest}.` : ""} Close these gaps before any investor outreach.`;
  if (snap.verdict === "Improving") return `${name} is building investor readiness for a ${stage} round. ${strongest ? `Your strongest signal is ${strongest}.` : ""} ${weakest ? `Improving ${weakest} would have the highest score impact right now.` : ""}`;
  if (snap.verdict === "Fundable") return `${name} is in a fundable position for a ${stage} round. ${strongest ? `Investors will be drawn to your ${strongest}.` : ""} ${snap.blockers_count === 0 ? "No critical blockers — you can start selective outreach while shoring up weaker areas." : "Address the remaining critical gaps before broad investor outreach."}`;
  return `${name} shows strong investor readiness${p.estimated_valuation > 0 ? ` with an estimated valuation of ${fmtMoney(p.estimated_valuation)}` : ""} for a ${stage} round. Focus on building your investor pipeline and preparing for diligence.`;
}

function buildSmartCTA(snap: GlobalReadinessSnapshot, ts: Record<FoundationTool, ToolState>): { label: string; href: string; description: string; ext?: boolean } {
  const s = snap.overall_score;
  const blockers = snap.red_flags.filter(f => f.blocking);
  if (ts.metrics.score === 0) return { label: "Start with Metrics →", href: "/metrics", description: "Metrics carry 25% of your score. Complete this first." };
  if (blockers.length >= 2) return { label: "Fix critical gaps →", href: blockers[0].href ?? "/metrics", description: `${blockers.length} critical issues are blocking your score.` };
  if (s < 40) {
    const next = (["metrics", "qa", "valuation", "pitch"] as FoundationTool[]).find(t => ts[t].score === 0);
    return { label: next ? `Complete ${TOOL_LABELS[next]} →` : "Keep building →", href: next ? TOOL_HREFS[next] : "/metrics", description: "Complete more tools to unlock your full readiness score." };
  }
  if (s < 65) {
    const weak = (Object.entries(ts) as [FoundationTool, ToolState][]).filter(([, st]) => st.score > 0 && st.score < 60).sort((a, b) => WEIGHTS[b[0]] - WEIGHTS[a[0]])[0];
    return { label: weak ? `Strengthen ${TOOL_LABELS[weak[0]]} →` : "Strengthen your pitch →", href: weak ? TOOL_HREFS[weak[0]] : "/pitch", description: "Improving your weakest area has the highest score impact right now." };
  }
  if (s < 80 && ts.dataroom.score === 0) return { label: "Prepare your data room →", href: "/dataroom", description: "Investors will request documents once conversations start." };
  return { label: "Book a readiness review →", href: CALENDLY_URL, description: "Your score is strong. Get expert feedback before starting outreach.", ext: true };
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardV2Page() {
  const [snap, setSnap] = useState<GlobalReadinessSnapshot | null>(null);
  const [ts, setTs] = useState<Record<FoundationTool, ToolState> | null>(null);
  const [profile, setProfile] = useState<FounderStartupProfile | null>(null);
  const [history, setHistory] = useState<GlobalReadinessSnapshot[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <span className="text-3xl">📊</span>
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
  const strengths = buildStrengths(ts, profile);
  const weaknesses = buildWeaknesses(ts, profile);
  const actions = buildNextActions(snap, ts);
  const narrative = buildNarrative(snap, profile);
  const smartCTA = buildSmartCTA(snap, ts);

  return (
    <div className="py-8 bg-background min-h-screen">
      <Container>
        <div className="space-y-5">

          {/* ─── 1. HERO ──────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden">
            {/* Top accent bar */}
            <div className={`h-1 w-full ${vc.bar}`} />
            <div className="p-6">
              <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
                {/* Left: identity + score */}
                <div className="flex gap-5 items-start">
                  <ScoreArc score={animatedScore} colorScore={snap.overall_score} size={96} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                        {profile.startup_name || "Your startup"}
                      </h1>
                      <span className={`inline-flex items-center h-7 px-2.5 rounded-full border text-xs font-bold ${vc.badge}`}>
                        {snap.verdict}
                      </span>
                    </div>
                    <p className="text-sm text-ink-secondary mb-1">
                      {[
                        profile.founder_name,
                        profile.country
                          ? `${getCountryFlag(profile.country) ? getCountryFlag(profile.country) + "\u202F" : ""}${profile.country}`
                          : null,
                        profile.sector,
                        profile.stage,
                      ].filter(Boolean).join(" · ") || "Complete your profile"}
                    </p>
                    <p className="text-sm text-muted italic">{vc.tagline}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {nextStep ? (
                        <Link href={nextStep.href}
                          className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                        >Continue: {nextStep.label} →</Link>
                      ) : (
                        <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                        >Book a readiness review →</a>
                      )}
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors disabled:opacity-50"
                      >
                        {exporting ? "Generating…" : "↓ Export PDF"}
                      </button>
                      <Link href="/onboard"
                        className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                      >Edit profile</Link>
                    </div>
                  </div>
                </div>

                {/* Right: stat chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 lg:w-44">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted font-semibold">Score</p>
                    <p className={`text-2xl font-black font-mono ${band.text}`}>{animatedScore}</p>
                    <p className="text-[10px] text-muted">/100</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted font-semibold">Tools</p>
                    <p className="text-2xl font-black font-mono text-ink">{animatedTools}</p>
                    <p className="text-[10px] text-muted">of 6</p>
                  </div>
                  <div className={`rounded-[var(--radius-md)] p-3 text-center border ${snap.blockers_count > 0 ? "bg-danger/5 border-danger/20" : "bg-soft border-border"}`}>
                    <p className="text-[10px] uppercase tracking-wide text-muted font-semibold">Gaps</p>
                    <p className={`text-2xl font-black font-mono ${snap.blockers_count > 0 ? "text-danger" : "text-ink"}`}>{animatedBlockers}</p>
                    <p className="text-[10px] text-muted">critical</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted font-semibold">Profile</p>
                    <p className="text-2xl font-black font-mono text-ink">{animatedProfile}%</p>
                    <p className="text-[10px] text-muted">done</p>
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-5 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                  <span>Investor readiness</span>
                  <span>{snap.overall_score}/100 · {snap.verdict}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${vc.bar}`} style={{ width: `${snap.overall_score}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>0 — Early</span><span>35 — Improving</span><span>60 — Fundable</span><span>80+ — Strong</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. TRACTION + VALUATION ──────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Traction */}
            <Card padding="sm">
              <CardHeader><CardTitle kicker="Traction">Revenue & growth metrics</CardTitle></CardHeader>
              <CardContent>
                {profile.mrr === 0 && profile.arr === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <p className="text-sm font-semibold text-muted mb-2">No traction data yet</p>
                    <p className="text-xs text-muted mb-4">Complete the Metrics tool to see ARR, MRR, Growth, and Runway here.</p>
                    <Link href="/metrics" className="text-sm font-bold text-accent hover:underline">Go to Metrics →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <MetricStat label="ARR" value={fmtMoney(animatedARR)} sub="Annual recurring" tone={profile.arr >= 240_000 ? "good" : profile.arr > 0 ? "warn" : "neutral"} />
                    <MetricStat label="MRR" value={fmtMoney(animatedMRR)} sub="Monthly recurring" tone={profile.mrr >= 20_000 ? "good" : profile.mrr > 0 ? "warn" : "neutral"} />
                    <MetricStat label="Growth" value={fmtPct(profile.growth_rate)} sub="MoM growth rate" tone={profile.growth_rate >= 15 ? "good" : profile.growth_rate >= 5 ? "warn" : profile.growth_rate > 0 ? "bad" : "neutral"} />
                    <MetricStat label="Runway" value={profile.runway > 0 ? `${Math.round(profile.runway)} mo` : "—"} sub="Months of cash" tone={profile.runway >= 18 ? "good" : profile.runway >= 9 ? "warn" : profile.runway > 0 ? "bad" : "neutral"} />
                  </div>
                )}
                {ts.metrics.score > 0 && (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBand(ts.metrics.score).bg}`} style={{ width: `${ts.metrics.score}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${scoreBand(ts.metrics.score).text}`}>{ts.metrics.score}/100</span>
                    </div>
                    <Link href="/metrics" className="text-xs text-accent font-semibold hover:underline">Update →</Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valuation */}
            <Card padding="sm">
              <CardHeader><CardTitle kicker="Valuation">Pre-money estimate</CardTitle></CardHeader>
              <CardContent>
                {profile.estimated_valuation === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <p className="text-sm font-semibold text-muted mb-2">No valuation data yet</p>
                    <p className="text-xs text-muted mb-4">Run the Valuation tool to get a blended pre-money estimate with range.</p>
                    <Link href="/valuation" className="text-sm font-bold text-accent hover:underline">Go to Valuation →</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">Estimated pre-money</p>
                      <p className={`text-3xl font-black font-mono ${scoreBand(ts.valuation.score).text}`}>
                        {fmtMoney(animatedVal)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricStat label="Stage" value={profile.stage || "—"} />
                      <MetricStat label="Sector" value={profile.sector || "—"} />
                    </div>
                  </div>
                )}
                {ts.valuation.score > 0 && (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBand(ts.valuation.score).bg}`} style={{ width: `${ts.valuation.score}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${scoreBand(ts.valuation.score).text}`}>{ts.valuation.score}/100</span>
                    </div>
                    <Link href="/valuation" className="text-xs text-accent font-semibold hover:underline">Update →</Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── 3. TOOL GRID ────────────────────────────────────────────── */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle kicker="Assessment modules">Tool performance overview</CardTitle>
              <span className="text-xs text-muted">{snap.completed_tools_count}/6 completed</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(Object.keys(ts) as FoundationTool[]).map(t => <ToolCard key={t} tool={t} state={ts[t]} />)}
              </div>
            </CardContent>
          </Card>

          {/* ─── 4. ANALYSIS ─────────────────────────────────────────────── */}
          <Card padding="sm">
            <CardHeader><CardTitle kicker="Fundraising analysis">Readiness breakdown</CardTitle></CardHeader>
            <CardContent>
              {/* Narrative */}
              <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4 mb-4">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Summary</p>
                <p className="text-sm text-ink-secondary leading-relaxed">{narrative}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Strengths */}
                {strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-success uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-success" />
                      What&apos;s working
                    </p>
                    <div className="space-y-2">
                      {strengths.map(s => (
                        <div key={s.label} className="bg-success/5 border border-success/15 rounded-[var(--radius-md)] px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink">✓ {s.label}</p>
                              <p className="text-xs text-ink-secondary mt-0.5">{s.detail}</p>
                            </div>
                            {s.href && <Link href={s.href} className="text-xs text-accent shrink-0 hover:underline">View →</Link>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weaknesses */}
                {weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-warning uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-warning" />
                      Needs attention
                    </p>
                    <div className="space-y-2">
                      {weaknesses.map(w => (
                        <div key={w.label} className="bg-warning/5 border border-warning/15 rounded-[var(--radius-md)] px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink">⚠ {w.label}</p>
                              <p className="text-xs text-ink-secondary mt-0.5">{w.detail}</p>
                            </div>
                            {w.href && <Link href={w.href} className="text-xs text-accent shrink-0 hover:underline">Fix →</Link>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── 5. CRITICAL ALERTS ──────────────────────────────────────── */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle kicker="Action needed">Critical alerts</CardTitle>
              {snap.red_flags.length > 0 && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${snap.blockers_count > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                  {snap.red_flags.length} {snap.red_flags.length === 1 ? "issue" : "issues"}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {snap.red_flags.length === 0 ? (
                <div className="bg-success/5 border border-success/20 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3">
                  <span className="text-success text-lg">✓</span>
                  <div>
                    <p className="text-sm font-bold text-success">No critical gaps</p>
                    <p className="text-xs text-muted mt-0.5">Your profile has no blocking issues at this time.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {snap.red_flags.map(f => <AlertCard key={f.id} flag={f} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── 6. NEXT ACTIONS + SMART CTA ─────────────────────────────── */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-5">
            {/* Next actions */}
            {actions.length > 0 && (
              <Card padding="sm">
                <CardHeader><CardTitle kicker="Your action plan">Immediate next actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {actions.map((a, i) => (
                      <div key={a.label} className="flex gap-3 bg-soft border border-border rounded-[var(--radius-md)] p-3">
                        <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ink">{a.label}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">{a.detail}</p>
                          {a.href && (
                            a.href.startsWith("http") ? (
                              <a href={a.href} target="_blank" rel="noopener noreferrer" className="text-xs text-accent mt-1.5 inline-block hover:underline font-semibold">Take action →</a>
                            ) : (
                              <Link href={a.href} className="text-xs text-accent mt-1.5 inline-block hover:underline font-semibold">Take action →</Link>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smart CTA */}
            <Card padding="sm">
              <CardHeader><CardTitle kicker="Recommended next step">What to do now</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col h-full">
                  <p className="text-xs text-muted leading-relaxed mb-4">{smartCTA.description}</p>
                  {smartCTA.ext ? (
                    <a href={smartCTA.href} target="_blank" rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center h-11 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                    >{smartCTA.label}</a>
                  ) : (
                    <Link href={smartCTA.href}
                      className="w-full inline-flex items-center justify-center h-11 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
                    >{smartCTA.label}</Link>
                  )}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted mb-3">Also available</p>
                    <div className="space-y-2">
                      <button onClick={handleExport} disabled={exporting}
                        className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/20 transition-colors disabled:opacity-50 text-left flex items-center gap-2"
                      >
                        <span>↓</span> {exporting ? "Generating PDF…" : "Export PDF report"}
                      </button>
                      <Link href="/onboard"
                        className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-border bg-soft text-xs font-semibold text-ink hover:border-ink/20 transition-colors flex items-center gap-2"
                      >
                        <span>✎</span> Update founder profile
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── 7. EXPERT CTA ───────────────────────────────────────────── */}
          <div className="rounded-[var(--radius-lg)] bg-ink overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white mb-0.5">
                  Get expert guidance on your fundraising
                </p>
                <p className="text-xs text-white/55 leading-relaxed">
                  Book a 30-minute session with a VCReady expert — review your score, validate your strategy, and get actionable feedback before investor meetings.
                </p>
              </div>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center h-10 px-5 rounded-[var(--radius-md)] bg-white text-ink text-sm font-bold hover:bg-white/90 transition-colors whitespace-nowrap"
              >
                Book a meeting →
              </a>
            </div>
          </div>

          {/* ─── 8. PROGRESS ─────────────────────────────────────────────── */}
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
              <Card padding="sm">
                <CardHeader>
                  <CardTitle kicker="Progress">Score over time</CardTitle>
                  {history.length > 0 && (
                    <span className="text-xs text-muted">
                      {history.length} {history.length === 1 ? "snapshot" : "snapshots"}
                    </span>
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
                      {/* Stats row */}
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
                          <p className={`text-xl font-extrabold font-mono ${
                            delta === null ? "text-muted"
                            : delta > 0   ? "text-success"
                            : delta < 0   ? "text-danger"
                            : "text-muted"
                          }`}>
                            {delta === null ? "—" : delta > 0 ? `+${delta}` : delta === 0 ? "→" : `${delta}`}
                          </p>
                        </div>
                        <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                          <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">Last saved</p>
                          <p className="text-xs font-semibold text-ink leading-snug mt-1">
                            {lastSeen ? fmtDate(lastSeen) : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Sparkline or limited-history prompt */}
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
                              <span className="text-[10px] text-muted">{lastSeen  ? fmtDateShort(lastSeen)  : ""}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-soft border border-border rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-2">
                          <span className="text-muted">◦</span>
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
            );
          })()}

        </div>
      </Container>
    </div>
  );
}
