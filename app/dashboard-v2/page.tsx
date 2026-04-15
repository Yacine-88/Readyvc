"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { refreshUnifiedProfile, getProfileCompletionPct } from "@/lib/foundation/profile";
import { getLocalToolStates } from "@/lib/foundation/tool-states";
import { getReadinessRedFlags, getGlobalVerdict, getSnapshotHistory, saveSnapshot, computeGlobalReadiness, loadSnapshotHistory } from "@/lib/foundation/readiness-engine";
import { FLOW_STEPS, getCompletedSteps, type FlowStepId } from "@/lib/flow";
import type {
  FoundationTool,
  GlobalReadinessSnapshot,
  ToolState,
} from "@/lib/foundation/types";

const WEIGHTS: Record<FoundationTool, number> = {
  metrics: 0.35,
  qa: 0.25,
  valuation: 0.2,
  captable: 0.1,
  pitch: 0.05,
  dataroom: 0.05,
};

function fmtMoney(value: number): string {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function verdictTone(verdict: string) {
  switch (verdict) {
    case "Strong":
      return {
        badge: "bg-success/10 text-success border-success/20",
        bar: "bg-success",
      };
    case "Fundable":
      return {
        badge: "bg-accent/10 text-accent border-accent/20",
        bar: "bg-accent",
      };
    case "Improving":
      return {
        badge: "bg-warning/10 text-warning border-warning/20",
        bar: "bg-warning",
      };
    default:
      return {
        badge: "bg-danger/10 text-danger border-danger/20",
        bar: "bg-danger",
      };
  }
}

function toolHref(tool: FoundationTool): string {
  switch (tool) {
    case "metrics":
      return "/metrics";
    case "valuation":
      return "/valuation";
    case "qa":
      return "/qa";
    case "captable":
      return "/captable";
    case "pitch":
      return "/pitch";
    case "dataroom":
      return "/dataroom";
    default:
      return "/dashboard";
  }
}

function statusTone(status: ToolState["status"]) {
  switch (status) {
    case "completed":
      return "bg-success";
    case "in_progress":
      return "bg-warning";
    default:
      return "bg-border";
  }
}

function getResumeStep(toolStates: Record<FoundationTool, ToolState>): {
  id: FlowStepId;
  href: string;
  label: string;
} | null {
  const completed = getCompletedSteps();

  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool]?.status === "in_progress" && !completed.includes(step.id)) {
      return step;
    }
  }

  for (const step of FLOW_STEPS) {
    if (step.id === "dashboard") continue;
    const tool = step.id as FoundationTool;
    if (toolStates[tool]?.status === "not_started") {
      return step;
    }
  }

  return null;
}

function buildSnapshot(): {
  snapshot: GlobalReadinessSnapshot;
  toolStates: Record<FoundationTool, ToolState>;
  profile: ReturnType<typeof refreshUnifiedProfile>;
} {
  const profile = refreshUnifiedProfile();
  const toolStates = getLocalToolStates();

  const overall_score = Math.round(
    (Object.entries(toolStates) as Array<[FoundationTool, ToolState]>).reduce(
      (sum, [tool, state]) => sum + state.score * WEIGHTS[tool],
      0
    )
  );

  const red_flags = getReadinessRedFlags(toolStates);
  const verdict = getGlobalVerdict(overall_score, red_flags);

  const toolEntries = Object.entries(toolStates) as Array<[FoundationTool, ToolState]>;

  const strongest_tool =
    toolEntries
      .slice()
      .sort((a, b) => b[1].score - a[1].score)
      .find(([, state]) => state.score > 0)?.[0] ?? null;

  const weakest_tool =
    toolEntries
      .slice()
      .sort((a, b) => a[1].score - b[1].score)
      .find(([, state]) => state.score < 70)?.[0] ?? null;

  const missing_tools = toolEntries
    .filter(([, state]) => state.score === 0)
    .map(([tool]) => tool);

  const completed_tools_count = toolEntries.filter(([, state]) => state.score > 0).length;

  const snapshot: GlobalReadinessSnapshot = {
    overall_score,
    verdict,
    blockers_count: red_flags.filter((flag) => flag.blocking).length,
    red_flags,
    source_scores: {
      metrics: toolStates.metrics.score,
      valuation: toolStates.valuation.score,
      qa: toolStates.qa.score,
      captable: toolStates.captable.score,
      pitch: toolStates.pitch.score,
      dataroom: toolStates.dataroom.score,
    },
    profile_completion_pct: getProfileCompletionPct({
      ...profile,
      overall_score,
    }),
    strongest_tool,
    weakest_tool,
    missing_tools,
    completed_tools_count,
    saved_at: new Date().toISOString(),
  };

  return { snapshot, toolStates, profile };
}

export default function DashboardV2Page() {
  const [snapshot, setSnapshot] = useState<GlobalReadinessSnapshot | null>(null);
  const [toolStates, setToolStates] = useState<Record<FoundationTool, ToolState> | null>(null);
  const [history, setHistory] = useState<GlobalReadinessSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // C1+C2: DB-first hydration — computeGlobalReadiness syncs profile + tool states
    // from Supabase into localStorage before reading sync functions.
    async function load() {
      try {
        const snap = await computeGlobalReadiness();
        const states = await import("@/lib/foundation/tool-states").then(m => m.getToolStates());
        setSnapshot(snap);
        setToolStates(states);
        saveSnapshot(snap);
        const hist = await loadSnapshotHistory();
        setHistory(hist);
      } catch (err) {
        console.error(err);
        // Fallback to localStorage-only path on any DB error
        try {
          const { snapshot, toolStates } = buildSnapshot();
          setSnapshot(snapshot);
          setToolStates(toolStates);
          saveSnapshot(snapshot);
          setHistory(getSnapshotHistory());
        } catch (fallbackErr) {
          setError(fallbackErr instanceof Error ? fallbackErr.message : "unknown error");
        }
      }
    }
    load();
  }, []);

  const profile = useMemo(() => refreshUnifiedProfile(), []);
  const nextStep = useMemo(
    () => (toolStates ? getResumeStep(toolStates) : null),
    [toolStates]
  );

  if (error) {
    return (
      <div className="py-8">
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-danger/20 bg-danger/5 p-6">
            <p className="text-sm font-semibold text-danger">Error</p>
            <p className="text-sm text-ink-secondary mt-2">{error}</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!snapshot || !toolStates) {
    return (
      <div className="py-8">
        <Container>
          <div className="animate-pulse h-96 rounded-[var(--radius-lg)] bg-soft" />
        </Container>
      </div>
    );
  }

  const tone = verdictTone(snapshot.verdict);

  return (
    <div className="py-8">
      <Container>
        <div className="space-y-5">
          <Card padding="lg">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div>
                <p className="eyebrow mb-2">Foundation Dashboard</p>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    {profile.startup_name || "Your startup"}
                  </h1>
                  <span
                    className={`inline-flex items-center h-8 px-3 rounded-full border text-sm font-semibold ${tone.badge}`}
                  >
                    {snapshot.verdict}
                  </span>
                </div>

                <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">
                  Founder: {profile.founder_name || "—"} · {profile.country || "—"} ·{" "}
                  {profile.sector || "—"} · {profile.stage || "—"}
                </p>

                <div className="flex flex-wrap gap-2 mt-5">
                  {nextStep ? (
                    <Link
                      href={nextStep.href}
                      className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                    >
                      Resume: {nextStep.label} →
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
                    >
                      Open current dashboard →
                    </Link>
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
                  <p className="eyebrow mb-1">Global score</p>
                  <p className="text-4xl font-extrabold tracking-tight font-mono">
                    {snapshot.overall_score}
                    <span className="text-base text-muted">/100</span>
                  </p>
                  <div className="mt-3 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${snapshot.overall_score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">
                      Blockers
                    </p>
                    <p className="text-xl font-bold font-mono">{snapshot.blockers_count}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">
                      Tools
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {snapshot.completed_tools_count}/6
                    </p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">
                      Profile
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {snapshot.profile_completion_pct}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Unified profile">Founder / Startup</CardTitle>
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
                    <p className="font-semibold">
                      ARR {fmtMoney(profile.arr)} · MRR {fmtMoney(profile.mrr)}
                    </p>
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

            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Tool states">Connected modules</CardTitle>
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
                            <p className="text-sm font-semibold">{state.label}</p>
                          </div>
                          <span className="text-xs font-mono text-muted">{state.score}/100</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              state.score >= 70
                                ? "bg-success"
                                : state.score >= 40
                                ? "bg-warning"
                                : "bg-danger"
                            }`}
                            style={{ width: `${state.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted mt-2 capitalize">
                          {state.status.replace("_", " ")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card padding="sm">
            <CardHeader>
              <CardTitle kicker="Red flags">Blocking logic</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.red_flags.length === 0 ? (
                <div className="bg-success/5 border border-success/20 rounded-[var(--radius-md)] p-4">
                  <p className="text-sm font-semibold text-success">
                    No active red flags detected.
                  </p>
                  <p className="text-xs text-muted mt-1">
                    The current profile does not expose explicit blocking issues.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshot.red_flags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`rounded-[var(--radius-md)] border p-4 ${
                        flag.blocking
                          ? "bg-danger/5 border-danger/20"
                          : "bg-warning/5 border-warning/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-ink">{flag.label}</p>
                            <span
                              className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold ${
                                flag.blocking
                                  ? "bg-danger/10 text-danger"
                                  : "bg-warning/10 text-warning"
                              }`}
                            >
                              {flag.blocking ? "Blocking" : "Warning"}
                            </span>
                          </div>
                          <p className="text-sm text-ink-secondary">{flag.reason}</p>
                          <p className="text-xs text-muted mt-2">{flag.action}</p>
                        </div>
                        {flag.href ? (
                          <Link
                            href={flag.href}
                            className="text-sm font-semibold text-accent shrink-0 hover:underline"
                          >
                            Open →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Engine output">Global snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Verdict</p>
                    <p className="font-semibold">{snapshot.verdict}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Saved at</p>
                    <p className="font-semibold font-mono text-xs">{snapshot.saved_at}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Strongest tool</p>
                    <p className="font-semibold">{snapshot.strongest_tool || "—"}</p>
                  </div>
                  <div className="bg-soft border border-border rounded-[var(--radius-md)] p-3">
                    <p className="eyebrow mb-1">Weakest tool</p>
                    <p className="font-semibold">{snapshot.weakest_tool || "—"}</p>
                  </div>
                </div>

                {snapshot.missing_tools.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                      Missing tools
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {snapshot.missing_tools.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-soft text-xs font-medium"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="History">Foundation snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted">No snapshots saved yet.</p>
                ) : (
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
                            <div className="w-12 text-xs font-semibold">
                              {prev ? (
                                <span
                                  className={
                                    delta > 0
                                      ? "text-success"
                                      : delta < 0
                                      ? "text-danger"
                                      : "text-muted"
                                  }
                                >
                                  {delta > 0 ? `+${delta}` : `${delta}`}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${item.overall_score}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted shrink-0">
                              {new Date(item.saved_at).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}