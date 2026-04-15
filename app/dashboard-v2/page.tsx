"use client";

import { useEffect, useState } from "react";
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
  ToolState,
} from "@/lib/foundation/types";

// ─── Weights ──────────────────────────────────────────────────────────────────
const WEIGHTS: Record<FoundationTool, number> = {
  metrics:   0.25,
  valuation: 0.20,
  qa:        0.20,
  pitch:     0.15,
  dataroom:  0.10,
  captable:  0.10,
};

const CALENDLY_URL = "https://calendly.com/vcready/30min";

const TOOL_LABELS: Record<FoundationTool, string> = {
  metrics:   "Metrics",
  valuation: "Valuation",
  qa:        "Q&A",
  captable:  "Cap Table",
  pitch:     "Pitch",
  dataroom:  "Data Room",
};

const STATUS_LABELS: Record<ToolState["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed:   "Completed",
};

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(value: number): string {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

// ─── Verdict styling ──────────────────────────────────────────────────────────
function verdictTone(verdict: string) {
  switch (verdict) {
    case "Strong":    return { badge: "bg-success/10 text-success border-success/20", bar: "bg-success" };
    case "Fundable":  return { badge: "bg-accent/10 text-accent border-accent/20",   bar: "bg-accent"  };
    case "Improving": return { badge: "bg-warning/10 text-warning border-warning/20", bar: "bg-warning" };
    default:          return { badge: "bg-danger/10 text-danger border-danger/20",   bar: "bg-danger"  };
  }
}

function toolHref(tool: FoundationTool): string {
  const map: Record<FoundationTool, string> = {
    metrics: "/metrics", valuation: "/valuation", qa: "/qa",
    captable: "/captable", pitch: "/pitch", dataroom: "/dataroom",
  };
  return map[tool];
}

function statusTone(status: ToolState["status"]) {
  switch (status) {
    case "completed":   return "bg-success";
    case "in_progress": return "bg-warning";
    default:            return "bg-border";
  }
}

function getResumeStep(toolStates: Record<FoundationTool, ToolState>): {
  id: FlowStepId; href: string; label: string;
} | null {
  const completed = getCompletedSteps();
  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool]?.status === "in_progress" && !completed.includes(step.id)) return step;
  }
  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool]?.status === "not_started") return step;
  }
  return null;
}

// ─── Advisory engine ──────────────────────────────────────────────────────────

interface AdvisoryItem { label: string; detail: string; href?: string; }

function getStrengths(
  toolStates: Record<FoundationTool, ToolState>,
  profile: FounderStartupProfile
): AdvisoryItem[] {
  const items: AdvisoryItem[] = [];
  const m = toolStates.metrics;
  const v = toolStates.valuation;
  const qa = toolStates.qa;
  const p = toolStates.pitch;
  const ct = toolStates.captable;
  const dr = toolStates.dataroom;

  if (m.score >= 70) {
    const detail = profile.mrr > 0
      ? `MRR ${fmtMoney(profile.mrr)}, ARR ${fmtMoney(profile.arr)}, ${profile.growth_rate}% growth — your traction story is compelling.`
      : "Your operating metrics are above the investor bar for your stage.";
    items.push({ label: "Strong traction metrics", detail, href: "/metrics" });
  }
  if (v.score >= 70) {
    const detail = profile.estimated_valuation > 0
      ? `Estimated pre-money valuation of ${fmtMoney(profile.estimated_valuation)} — well-supported by your growth assumptions.`
      : "Your valuation model is solid and defensible.";
    items.push({ label: "Compelling valuation", detail, href: "/valuation" });
  }
  if (qa.score >= 70) {
    items.push({
      label: "Investor Q&A readiness",
      detail: "You can handle tough investor questions confidently. This is a real differentiator in live meetings.",
      href: "/qa",
    });
  }
  if (p.score >= 70) {
    items.push({
      label: "Strong pitch narrative",
      detail: "Your pitch deck covers the key investor areas — problem, traction, team, and ask — at a high level.",
      href: "/pitch",
    });
  }
  if (ct.score >= 70) {
    items.push({
      label: "Clean cap table",
      detail: "Your equity structure won't create friction in diligence. Founders maintain control.",
      href: "/captable",
    });
  }
  if (dr.score >= 70) {
    items.push({
      label: "Data room organized",
      detail: "Your diligence documents are in order — this accelerates deal closure significantly.",
      href: "/dataroom",
    });
  }
  return items;
}

function getWeaknesses(
  toolStates: Record<FoundationTool, ToolState>,
  profile: FounderStartupProfile
): AdvisoryItem[] {
  const items: AdvisoryItem[] = [];

  if (toolStates.metrics.score > 0 && toolStates.metrics.score < 50) {
    const detail = profile.mrr === 0
      ? "No MRR recorded. Investors need to see revenue before considering a Seed or Series A round."
      : `MRR of ${fmtMoney(profile.mrr)} is below typical investor expectations. Target $20K+ MRR before raising.`;
    items.push({ label: "Traction metrics need work", detail, href: "/metrics" });
  }
  if (toolStates.qa.score > 0 && toolStates.qa.score < 50) {
    items.push({
      label: "Investor Q&A preparation is weak",
      detail: "Founders who struggle with investor questions lose deals — even with great metrics. Prioritize this.",
      href: "/qa",
    });
  }
  if (toolStates.valuation.score > 0 && toolStates.valuation.score < 50) {
    items.push({
      label: "Valuation model needs strengthening",
      detail: "A weak valuation model signals lack of financial fluency. Investors will probe this hard.",
      href: "/valuation",
    });
  }
  if (toolStates.pitch.score > 0 && toolStates.pitch.score < 50) {
    items.push({
      label: "Pitch deck has critical gaps",
      detail: "Key sections — team, traction, or the ask — are incomplete. Fix these before any investor meeting.",
      href: "/pitch",
    });
  }
  if (profile.runway > 0 && profile.runway < 9) {
    items.push({
      label: `Only ${profile.runway} months of runway`,
      detail: "Fundraising under pressure weakens your negotiating position. Extend runway if possible before starting a formal process.",
      href: "/metrics",
    });
  }
  return items;
}

function getNextActions(
  snapshot: GlobalReadinessSnapshot,
  toolStates: Record<FoundationTool, ToolState>
): AdvisoryItem[] {
  const actions: AdvisoryItem[] = [];
  const s = snapshot.overall_score;
  const blockers = snapshot.red_flags.filter((f) => f.blocking);

  // Critical blockers first
  for (const b of blockers.slice(0, 2)) {
    actions.push({ label: b.action, detail: b.reason, href: b.href });
  }

  // Missing high-weight tools
  const highWeightMissing = (["metrics", "qa", "valuation", "pitch"] as FoundationTool[])
    .filter((t) => toolStates[t].score === 0);
  for (const tool of highWeightMissing.slice(0, 2 - Math.min(blockers.length, 2))) {
    actions.push({
      label: `Complete ${TOOL_LABELS[tool]}`,
      detail: `${TOOL_LABELS[tool]} carries ${Math.round(WEIGHTS[tool] * 100)}% of your readiness score and hasn't been started yet.`,
      href: toolHref(tool),
    });
  }

  // Score-based advice
  if (s >= 70 && toolStates.dataroom.score === 0) {
    actions.push({
      label: "Prepare your data room",
      detail: "At your readiness level, investors will ask for documents. Be ready before they ask.",
      href: "/dataroom",
    });
  }
  if (s >= 75 && actions.length < 3) {
    actions.push({
      label: "Book a readiness review",
      detail: "Your score is strong. Get a second opinion from an experienced VC advisor before starting outreach.",
      href: CALENDLY_URL,
    });
  }

  return actions.slice(0, 4);
}

function getFundraisingNarrative(
  snapshot: GlobalReadinessSnapshot,
  profile: FounderStartupProfile
): string {
  const name = profile.startup_name || "Your startup";
  const stage = profile.stage || "early stage";
  const s = snapshot.overall_score;
  const v = snapshot.verdict;
  const strongest = snapshot.strongest_tool ? TOOL_LABELS[snapshot.strongest_tool] : null;
  const weakest = snapshot.weakest_tool ? TOOL_LABELS[snapshot.weakest_tool] : null;

  if (s < 25) {
    return `${name} is at the very start of its investor readiness journey. At this stage, the priority is to complete the core assessment modules — especially Metrics and Q&A — before approaching any investor. Focus on building the fundamentals first.`;
  }
  if (v === "Early") {
    return `${name} is building investor readiness but has material gaps that would likely stop a deal early in diligence. ${weakest ? `The biggest area to address is ${weakest}.` : ""} Close these gaps before starting formal investor outreach.`;
  }
  if (v === "Improving") {
    return `${name} is making solid progress toward fundraising readiness for a ${stage} round. ${strongest ? `Your strongest signal is ${strongest}.` : ""} ${weakest ? `The key area to improve is ${weakest} — addressing this could meaningfully increase your score and investor confidence.` : ""}`;
  }
  if (v === "Fundable") {
    return `${name} is in a fundable position for a ${stage} round. ${strongest ? `Investors will be attracted by your ${strongest}.` : ""} ${snapshot.blockers_count === 0 ? "No critical blockers detected — you can start selective outreach while continuing to strengthen weaker areas." : "Address the remaining critical gaps before starting broad investor outreach."}`;
  }
  // Strong
  return `${name} shows strong investor readiness for a ${stage} round. ${profile.estimated_valuation > 0 ? `With an estimated valuation of ${fmtMoney(profile.estimated_valuation)}, you have a credible anchor for term sheet discussions.` : ""} Your profile is compelling — focus your energy on building your investor pipeline and preparing for diligence.`;
}

function getSmartCTA(
  snapshot: GlobalReadinessSnapshot,
  toolStates: Record<FoundationTool, ToolState>
): { label: string; href: string; description: string; external?: boolean } {
  const s = snapshot.overall_score;
  const blockers = snapshot.red_flags.filter((f) => f.blocking);

  if (toolStates.metrics.score === 0) {
    return {
      label: "Start with Metrics →",
      href: "/metrics",
      description: "Metrics carry 25% of your score — complete this first.",
    };
  }
  if (blockers.length >= 2) {
    return {
      label: "Fix critical gaps →",
      href: blockers[0].href ?? "/metrics",
      description: `${blockers.length} critical ${blockers.length === 1 ? "issue" : "issues"} blocking your readiness score.`,
    };
  }
  if (s < 40) {
    const next = (["metrics", "qa", "valuation", "pitch"] as FoundationTool[])
      .find((t) => toolStates[t].score === 0);
    return {
      label: next ? `Complete ${TOOL_LABELS[next]} →` : "Keep building →",
      href: next ? toolHref(next) : "/metrics",
      description: "Complete the remaining tools to unlock your full score.",
    };
  }
  if (s < 65) {
    const weak = (Object.entries(toolStates) as Array<[FoundationTool, ToolState]>)
      .filter(([, st]) => st.score > 0 && st.score < 60)
      .sort((a, b) => WEIGHTS[b[0]] - WEIGHTS[a[0]])[0];
    return {
      label: weak ? `Strengthen ${TOOL_LABELS[weak[0]]} →` : "Strengthen your pitch →",
      href: weak ? toolHref(weak[0]) : "/pitch",
      description: "Improving your weakest areas has the highest score impact.",
    };
  }
  if (s < 80 && toolStates.dataroom.score === 0) {
    return {
      label: "Prepare your data room →",
      href: "/dataroom",
      description: "Investors will ask for documents once conversations start.",
    };
  }
  return {
    label: "Book a readiness review →",
    href: CALENDLY_URL,
    description: "Your score is strong. Get expert feedback before starting outreach.",
    external: true,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardV2Page() {
  const [snapshot, setSnapshot] = useState<GlobalReadinessSnapshot | null>(null);
  const [toolStates, setToolStates] = useState<Record<FoundationTool, ToolState> | null>(null);
  const [profile, setProfile] = useState<FounderStartupProfile | null>(null);
  const [history, setHistory] = useState<GlobalReadinessSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Run main readiness compute and snapshot history in parallel
        const [snap, hist] = await Promise.all([
          computeGlobalReadiness(),   // hydrates localStorage from DB as side-effect
          loadSnapshotHistory(),      // can run concurrently
        ]);

        // After computeGlobalReadiness() has hydrated localStorage, read sync functions
        // — no extra DB round-trip needed
        const states = getLocalToolStates();
        const freshProfile = refreshUnifiedProfile();

        setSnapshot(snap);
        setToolStates(states);
        setProfile(freshProfile);
        setHistory(hist);
        saveSnapshot(snap);
      } catch (err) {
        console.error("[dashboard-v2] load error:", err);
        // Fallback: build from whatever is in localStorage right now
        try {
          const states = getLocalToolStates();
          const freshProfile = refreshUnifiedProfile();
          const redFlags = getReadinessRedFlags(states);
          const overallScore = Math.round(
            (Object.entries(states) as Array<[FoundationTool, ToolState]>).reduce(
              (sum, [tool, state]) => sum + state.score * WEIGHTS[tool], 0
            )
          );
          const fallback: GlobalReadinessSnapshot = {
            overall_score: overallScore,
            verdict: getGlobalVerdict(overallScore, redFlags),
            blockers_count: redFlags.filter((f) => f.blocking).length,
            red_flags: redFlags,
            source_scores: {
              metrics: states.metrics.score, valuation: states.valuation.score,
              qa: states.qa.score, captable: states.captable.score,
              pitch: states.pitch.score, dataroom: states.dataroom.score,
            },
            profile_completion_pct: getProfileCompletionPct({ ...freshProfile, overall_score: overallScore }),
            strongest_tool: (Object.entries(states) as Array<[FoundationTool, ToolState]>)
              .sort((a, b) => b[1].score - a[1].score).find(([, s]) => s.score > 0)?.[0] ?? null,
            weakest_tool: (Object.entries(states) as Array<[FoundationTool, ToolState]>)
              .sort((a, b) => a[1].score - b[1].score).find(([, s]) => s.score < 70)?.[0] ?? null,
            missing_tools: (Object.entries(states) as Array<[FoundationTool, ToolState]>)
              .filter(([, s]) => s.score === 0).map(([t]) => t),
            completed_tools_count: Object.values(states).filter((s) => s.score > 0).length,
            saved_at: new Date().toISOString(),
          };
          setSnapshot(fallback);
          setToolStates(states);
          setProfile(freshProfile);
          setHistory(getSnapshotHistory());
          saveSnapshot(fallback);
        } catch (fbErr) {
          setError(fbErr instanceof Error ? fbErr.message : "unknown error");
        }
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="py-8">
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-danger/20 bg-danger/5 p-6">
            <p className="text-sm font-semibold text-danger">Something went wrong</p>
            <p className="text-sm text-ink-secondary mt-2">{error}</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!snapshot || !toolStates || !profile) {
    return (
      <div className="py-8">
        <Container>
          <div className="space-y-4">
            <div className="animate-pulse h-48 rounded-[var(--radius-lg)] bg-soft" />
            <div className="animate-pulse h-64 rounded-[var(--radius-lg)] bg-soft" />
            <div className="animate-pulse h-40 rounded-[var(--radius-lg)] bg-soft" />
          </div>
        </Container>
      </div>
    );
  }

  // Empty state — no tool completed yet
  if (snapshot.completed_tools_count === 0) {
    return (
      <div className="py-8">
        <Container>
          <Card padding="lg">
            <div className="flex flex-col items-center text-center py-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-soft border border-border flex items-center justify-center mb-5">
                <span className="text-2xl">📊</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-2">
                Complete your first tool to unlock your readiness score
              </h1>
              <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                Your investor readiness score is calculated from 6 tools. Start with Metrics —
                it carries the most weight and unlocks the full dashboard.
              </p>
              <Link
                href="/metrics"
                className="inline-flex items-center h-11 px-6 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Start with Metrics →
              </Link>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  const tone = verdictTone(snapshot.verdict);
  const nextStep = getResumeStep(toolStates);
  const strengths = getStrengths(toolStates, profile);
  const weaknesses = getWeaknesses(toolStates, profile);
  const nextActions = getNextActions(snapshot, toolStates);
  const narrative = getFundraisingNarrative(snapshot, profile);
  const smartCTA = getSmartCTA(snapshot, toolStates);

  return (
    <div className="py-8">
      <Container>
        <div className="space-y-5">

          {/* ── Hero ── */}
          <Card padding="lg">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div>
                <p className="eyebrow mb-2">Investor Readiness</p>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    {profile.startup_name || "Your startup"}
                  </h1>
                  <span className={`inline-flex items-center h-8 px-3 rounded-full border text-sm font-semibold ${tone.badge}`}>
                    {snapshot.verdict}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">
                  {profile.founder_name || "Founder"} · {profile.country || "—"} · {profile.sector || "—"} · {profile.stage || "—"}
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {nextStep ? (
                    <Link
                      href={nextStep.href}
                      className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                    >
                      Continue: {nextStep.label} →
                    </Link>
                  ) : (
                    <a
                      href={CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                    >
                      Book a readiness review →
                    </a>
                  )}
                  <Link
                    href="/onboard"
                    className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] border border-border bg-soft text-sm font-semibold text-ink hover:border-ink/20 transition-colors"
                  >
                    Edit profile
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                  <p className="eyebrow mb-1">Readiness score</p>
                  <p className="text-4xl font-extrabold tracking-tight font-mono">
                    {snapshot.overall_score}
                    <span className="text-base text-muted">/100</span>
                  </p>
                  <div className="mt-3 h-2 bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${snapshot.overall_score}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">Gaps</p>
                    <p className="text-xl font-bold font-mono">{snapshot.blockers_count}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">Tools</p>
                    <p className="text-xl font-bold font-mono">{snapshot.completed_tools_count}/6</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">Profile</p>
                    <p className="text-xl font-bold font-mono">{snapshot.profile_completion_pct}%</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Fundraising narrative + smart CTA ── */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle kicker="Analysis">Fundraising readiness summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-secondary leading-relaxed mb-5">{narrative}</p>
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">{smartCTA.description}</p>
                </div>
                {smartCTA.external ? (
                  <a
                    href={smartCTA.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0"
                  >
                    {smartCTA.label}
                  </a>
                ) : (
                  <Link
                    href={smartCTA.href}
                    className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0"
                  >
                    {smartCTA.label}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Strengths & Weaknesses ── */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid lg:grid-cols-2 gap-5">
              {strengths.length > 0 && (
                <Card padding="sm">
                  <CardHeader>
                    <CardTitle kicker="What's working">Top strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strengths.map((s) => (
                        <div key={s.label} className="bg-success/5 border border-success/15 rounded-[var(--radius-md)] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink mb-1">✓ {s.label}</p>
                              <p className="text-xs text-ink-secondary">{s.detail}</p>
                            </div>
                            {s.href && (
                              <Link href={s.href} className="text-xs text-accent shrink-0 hover:underline">View →</Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {weaknesses.length > 0 && (
                <Card padding="sm">
                  <CardHeader>
                    <CardTitle kicker="What to fix">Areas needing attention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weaknesses.map((w) => (
                        <div key={w.label} className="bg-warning/5 border border-warning/15 rounded-[var(--radius-md)] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink mb-1">⚠ {w.label}</p>
                              <p className="text-xs text-ink-secondary">{w.detail}</p>
                            </div>
                            {w.href && (
                              <Link href={w.href} className="text-xs text-accent shrink-0 hover:underline">Fix →</Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Next actions ── */}
          {nextActions.length > 0 && (
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Action plan">Immediate next actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {nextActions.map((action, i) => (
                    <div key={action.label} className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink mb-1">{action.label}</p>
                          <p className="text-xs text-ink-secondary">{action.detail}</p>
                          {action.href && (
                            action.href.startsWith("http") ? (
                              <a href={action.href} target="_blank" rel="noopener noreferrer" className="text-xs text-accent mt-2 inline-block hover:underline">
                                Take action →
                              </a>
                            ) : (
                              <Link href={action.href} className="text-xs text-accent mt-2 inline-block hover:underline">
                                Take action →
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            {/* ── Company profile ── */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Company profile">Founder & startup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Founder</p>
                    <p className="font-semibold">{profile.founder_name || "—"}</p>
                    <p className="text-muted text-xs mt-1">{profile.founder_email || "—"}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Startup</p>
                    <p className="font-semibold">{profile.startup_name || "—"}</p>
                    <p className="text-muted text-xs mt-1">
                      {profile.country || "—"} · {profile.sector || "—"} · {profile.stage || "—"}
                    </p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Traction</p>
                    <p className="font-semibold">ARR {fmtMoney(profile.arr)} · MRR {fmtMoney(profile.mrr)}</p>
                    <p className="text-muted text-xs mt-1">
                      Growth {profile.growth_rate || 0}% · Runway {profile.runway || 0} mo
                    </p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Valuation</p>
                    <p className="font-semibold">{fmtMoney(profile.estimated_valuation)}</p>
                    <p className="text-muted text-xs mt-1">
                      Raised before: {profile.has_raised_before ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Your tools ── */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Your tools">Assessment modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(Object.keys(toolStates) as FoundationTool[]).map((tool) => {
                    const state = toolStates[tool];
                    return (
                      <Link
                        key={tool}
                        href={toolHref(tool)}
                        className="bg-soft border border-border rounded-[var(--radius-md)] p-3 hover:border-ink/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusTone(state.status)}`} />
                            <p className="text-sm font-semibold">{TOOL_LABELS[tool]}</p>
                          </div>
                          <span className="text-xs font-mono text-muted">{state.score}/100</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${state.score >= 70 ? "bg-success" : state.score >= 40 ? "bg-warning" : "bg-danger"}`}
                            style={{ width: `${state.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted mt-2">{STATUS_LABELS[state.status]}</p>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Critical gaps ── */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle kicker="Action needed">Critical gaps</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.red_flags.length === 0 ? (
                <div className="bg-success/5 border border-success/20 rounded-[var(--radius-md)] p-4">
                  <p className="text-sm font-semibold text-success">No critical gaps detected.</p>
                  <p className="text-xs text-muted mt-1">
                    Your current profile does not show any blocking issues.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshot.red_flags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`rounded-[var(--radius-md)] border p-4 ${flag.blocking ? "bg-danger/5 border-danger/20" : "bg-warning/5 border-warning/20"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-ink">{flag.label}</p>
                            <span className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold ${flag.blocking ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                              {flag.blocking ? "Critical" : "Warning"}
                            </span>
                          </div>
                          <p className="text-sm text-ink-secondary">{flag.reason}</p>
                          <p className="text-xs text-muted mt-2">{flag.action}</p>
                        </div>
                        {flag.href && (
                          <Link href={flag.href} className="text-sm font-semibold text-accent shrink-0 hover:underline">
                            Fix →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* ── Readiness at a glance ── */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Summary">Your readiness at a glance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Verdict</p>
                    <p className="font-semibold">{snapshot.verdict}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Last updated</p>
                    <p className="font-semibold text-sm">{fmtDate(snapshot.saved_at)}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Strongest area</p>
                    <p className="font-semibold">{snapshot.strongest_tool ? TOOL_LABELS[snapshot.strongest_tool] : "—"}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Needs most work</p>
                    <p className="font-semibold">{snapshot.weakest_tool ? TOOL_LABELS[snapshot.weakest_tool] : "—"}</p>
                  </div>
                </div>

                {snapshot.missing_tools.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                      Not yet started
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {snapshot.missing_tools.map((tool) => (
                        <Link
                          key={tool}
                          href={toolHref(tool)}
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-soft text-xs font-medium hover:border-ink/20 transition-colors"
                        >
                          {TOOL_LABELS[tool]} →
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Score history ── */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Progress">Score history</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted">No history saved yet. Scores are recorded each time you save a tool.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {history
                        .slice()
                        .reverse()
                        .slice(0, 8)
                        .map((item, index, arr) => {
                          const prev = arr[index + 1];
                          const delta = prev ? item.overall_score - prev.overall_score : 0;
                          return (
                            <div
                              key={`${item.saved_at}-${index}`}
                              className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                            >
                              <div className="w-14 text-2xl font-extrabold font-mono tracking-tight">
                                {item.overall_score}
                              </div>
                              <div className="w-10 text-xs font-semibold">
                                {prev ? (
                                  <span className={delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"}>
                                    {delta > 0 ? `+${delta}` : delta !== 0 ? `${delta}` : "—"}
                                  </span>
                                ) : (
                                  <span className="text-muted text-[10px]">first</span>
                                )}
                              </div>
                              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${item.overall_score}%` }} />
                              </div>
                              <div className="text-xs text-muted shrink-0">{fmtDate(item.saved_at)}</div>
                            </div>
                          );
                        })}
                    </div>
                    {history.length > 8 && (
                      <p className="text-xs text-muted mt-3">Showing last 8 of {history.length} entries.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </Container>
    </div>
  );
}
