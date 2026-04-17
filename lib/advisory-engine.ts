/**
 * advisory-engine.ts
 *
 * Rule-based fundraising advisory layer for VCReady.
 * Consumes all dashboard intelligence signals and produces
 * founder-facing, actionable guidance.
 *
 * Deterministic — no AI API. Pure computation, safe to import anywhere.
 */

import type {
  FoundationTool,
  FounderStartupProfile,
  GlobalReadinessSnapshot,
  ReadinessRedFlag,
  ToolState,
} from "@/lib/foundation/types";
import type { BenchmarkResult, YouVsMarket } from "@/lib/benchmark-engine";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AdvisoryItem {
  id: string;
  label: string;
  detail: string;
  href?: string;
  severity?: "critical" | "high" | "medium" | "low";
  tag?: string;        // e.g. "Traction", "Pitch", "Market"
}

export interface AdvisoryCTA {
  label: string;
  href: string;
  description: string;
  variant: "primary" | "secondary" | "expert";
  ext?: boolean;
}

export interface AdvisoryOutput {
  /** One-paragraph fundraising readiness summary. Candid, founder-facing. */
  readiness_summary: string;

  /**
   * Single most important strategic recommendation.
   * Answers: "If I do ONE thing this week, what should it be?"
   */
  recommended_strategy: string;

  /** Top 3 things to fix/do — ordered by impact */
  top_priorities: AdvisoryItem[];

  /** Things investors will likely challenge in a live meeting */
  investor_challenges: AdvisoryItem[];

  /** Concrete next actions with links */
  next_actions: AdvisoryItem[];

  /** Primary CTA the founder should click right now */
  primary_cta: AdvisoryCTA;

  /** Secondary CTA (optional) */
  secondary_cta?: AdvisoryCTA;

  /** Confidence tier of the advisory (depends on how much data we have) */
  data_completeness: "full" | "partial" | "minimal";
}

// ─── Internal inputs ──────────────────────────────────────────────────────────

export interface AdvisoryInputs {
  snap:      GlobalReadinessSnapshot;
  profile:   FounderStartupProfile;
  ts:        Record<FoundationTool, ToolState>;
  benchmark: BenchmarkResult;
  yvm:       YouVsMarket;
  yourRaisedM:    number | null;   // $M (null if not set)
  yourValuationM: number | null;   // $M (null if not set)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<FoundationTool, string> = {
  metrics: "Metrics", valuation: "Valuation", qa: "Q&A",
  captable: "Cap Table", pitch: "Pitch", dataroom: "Data Room",
};

const TOOL_HREFS: Record<FoundationTool, string> = {
  metrics: "/metrics", valuation: "/valuation", qa: "/qa",
  captable: "/captable", pitch: "/pitch", dataroom: "/dataroom",
};

const WEIGHTS: Record<FoundationTool, number> = {
  metrics: 0.25, valuation: 0.20, qa: 0.20,
  pitch: 0.15, dataroom: 0.10, captable: 0.10,
};

const CALENDLY_URL = "https://calendly.com/vcready/30min";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function fmtPct(v: number): string {
  return v > 0 ? `${Math.round(v)}%` : "—";
}

function completedTools(ts: Record<FoundationTool, ToolState>): FoundationTool[] {
  return (Object.keys(ts) as FoundationTool[]).filter(t => ts[t].score > 0);
}

function missingHighWeightTools(ts: Record<FoundationTool, ToolState>): FoundationTool[] {
  return (["metrics", "qa", "valuation", "pitch"] as FoundationTool[]).filter(t => ts[t].score === 0);
}

function weakestHighWeightTool(ts: Record<FoundationTool, ToolState>): FoundationTool | null {
  return (Object.entries(ts) as [FoundationTool, ToolState][])
    .filter(([t, s]) => s.score > 0 && s.score < 60 && WEIGHTS[t] >= 0.15)
    .sort((a, b) => WEIGHTS[b[0]] - WEIGHTS[a[0]])
    .map(([t]) => t)[0] ?? null;
}

// ─── Readiness summary ────────────────────────────────────────────────────────

function buildReadinessSummary(inputs: AdvisoryInputs): string {
  const { snap, profile, ts, yvm, yourRaisedM, yourValuationM } = inputs;
  const s = snap.overall_score;
  const name = profile.startup_name || "Your startup";
  const stage = profile.stage || "your stage";
  const blockers = snap.red_flags.filter(f => f.blocking);

  // Minimal data
  if (completedTools(ts).length === 0) {
    return `${name} hasn't completed any tools yet. Without data, it's impossible to assess investor readiness. Start with Metrics — it carries the most weight (25%) and sets the foundation for everything else.`;
  }

  // Very early
  if (s < 25) {
    return `${name} is at the beginning of its fundraising readiness journey. Your current score of ${s}/100 indicates material gaps across most areas investors scrutinize. Before approaching any investor, complete the Metrics and Q&A tools — together they drive 45% of your score.`;
  }

  // Strong traction but weak story tools
  const goodMetrics = ts.metrics.score >= 65;
  const weakPitch = ts.pitch.score < 40;
  const weakQA = ts.qa.score < 40;
  if (goodMetrics && (weakPitch || weakQA)) {
    return `${name} has solid traction data${profile.mrr > 0 ? ` (MRR ${fmtMoney(profile.mrr)})` : ""} — that's your biggest asset. But ${weakPitch && weakQA ? "your pitch narrative and investor Q&A readiness are underdeveloped" : weakPitch ? "your pitch narrative needs work" : "your investor Q&A readiness is weak"}. Strong numbers with a weak story lose deals. Fix this before your first meeting.`;
  }

  // Aggressive valuation vs market
  const aggressiveVal = yvm.raisedVsMedian === "above" && yvm.raisedVsP75 === "above";
  if (aggressiveVal && ts.pitch.score < 65) {
    return `${name} is targeting a raise${yourRaisedM ? ` of $${yourRaisedM}M` : ""} that is above the P75 for comparable deals. That's not a problem — but it demands an exceptional pitch and sharp answers to tough investor questions. Your pitch and Q&A scores suggest you're not there yet. Strengthen the narrative before making asks.`;
  }

  // High score, ready for outreach
  if (s >= 75 && blockers.length === 0) {
    return `${name} shows strong investor readiness (${s}/100) for a ${stage} round${yourValuationM ? ` with a ${fmtMoney(yourValuationM * 1_000_000)} pre-money estimate` : ""}. No critical blockers. This is the right time to start building your investor list and preparing for first conversations. Focus on maintaining your data room and refining your narrative.`;
  }

  // Fundable with some gaps
  if (snap.verdict === "Fundable") {
    return `${name} is in a fundable position (${s}/100) for a ${stage} round. ${blockers.length > 0 ? `There ${blockers.length === 1 ? "is 1 critical gap" : `are ${blockers.length} critical gaps`} to address before broad outreach.` : "No critical blockers — you can begin selective outreach now."} ${snap.weakest_tool ? `Shoring up ${TOOL_LABELS[snap.weakest_tool]} will have the highest score impact.` : ""}`;
  }

  // Improving
  if (snap.verdict === "Improving") {
    const missing = missingHighWeightTools(ts);
    return `${name} is building momentum (${s}/100) toward a ${stage} raise. ${missing.length > 0 ? `Completing ${missing.slice(0, 2).map(t => TOOL_LABELS[t]).join(" and ")} would unlock significant score improvements and give investors a clearer picture of your readiness.` : `Your strongest tools are in place — now focus on closing the gaps in lower-scoring areas.`}`;
  }

  // Early
  return `${name} has material readiness gaps (${s}/100) that would raise questions early in investor diligence. ${snap.weakest_tool ? `Your weakest area is ${TOOL_LABELS[snap.weakest_tool]}.` : ""} Address the critical blockers first — only then consider investor outreach.`;
}

// ─── Recommended strategy ─────────────────────────────────────────────────────

function buildRecommendedStrategy(inputs: AdvisoryInputs): string {
  const { snap, profile, ts, yvm } = inputs;
  const s = snap.overall_score;
  const blockers = snap.red_flags.filter(f => f.blocking);

  // No data at all
  if (completedTools(ts).length === 0) {
    return "Start with the Metrics tool today. It carries 25% of your score and unlocks the most meaningful signals for investors — revenue, growth, and runway.";
  }

  // Multiple critical blockers
  if (blockers.length >= 2) {
    return `You have ${blockers.length} critical gaps that would stop a deal before it starts. Fix these before any investor outreach — every conversation before they're resolved will likely end in rejection.`;
  }

  // Metrics not started and it's the most important
  if (ts.metrics.score === 0) {
    return "Complete the Metrics tool first. Without revenue and growth data, investors have no foundation to evaluate your ask — even a great story won't get you far.";
  }

  // Strong metrics, weak narrative tools
  if (ts.metrics.score >= 65 && ts.pitch.score < 50 && ts.qa.score < 50) {
    return "You have the traction — now build the story. Strengthen your pitch and investor Q&A before the first meeting. A founder who can't articulate the 'why now' and 'why us' leaves valuation points on the table.";
  }

  // Strong metrics, only pitch weak
  if (ts.metrics.score >= 65 && ts.pitch.score < 50) {
    return "Your numbers are solid. The bottleneck is your pitch narrative. Tighten the problem statement, the traction story, and the ask before reaching out to investors.";
  }

  // Aggressive market positioning
  if (yvm.raisedVsP75 === "above") {
    return "You're targeting a raise above the P75 for comparable deals. That's achievable — but only with a compelling narrative that justifies the premium. Make sure your pitch and Q&A scores reflect that confidence.";
  }

  // Below median raise — conservative
  if (yvm.raisedVsMedian === "below" && s >= 55) {
    return "Your raise target is below market median for comparable deals. Consider whether your ask fully reflects your traction and market opportunity — leaving money on the table is as costly as over-asking.";
  }

  // Good score, missing dataroom
  if (s >= 65 && ts.dataroom.score === 0) {
    return "You're close to investor-ready. The missing piece is your data room — prepare it now, before first meetings, so you can respond to diligence requests immediately instead of scrambling later.";
  }

  // High readiness — push to outreach
  if (s >= 75) {
    return `Your readiness score (${s}/100) is strong. The next constraint isn't preparation — it's outreach. Start building your investor list and booking introductory calls. Get expert feedback on your pitch before the first real conversation.`;
  }

  // Improving — find the highest leverage tool
  const weakHighWeight = weakestHighWeightTool(ts);
  if (weakHighWeight) {
    return `Improving ${TOOL_LABELS[weakHighWeight]} has the highest leverage on your score right now — it carries ${Math.round(WEIGHTS[weakHighWeight] * 100)}% of your total readiness. Make it your priority this week.`;
  }

  // Complete missing tools
  const missing = missingHighWeightTools(ts);
  if (missing.length > 0) {
    return `Complete ${TOOL_LABELS[missing[0]]} next — it's your highest-weight incomplete tool and represents ${Math.round(WEIGHTS[missing[0]] * 100)}% of your total score.`;
  }

  return "Keep building completeness across all tools. Investors look at the full picture — a 60-point Metrics score won't save a 20-point Pitch score in a live meeting.";
}

// ─── Top priorities ───────────────────────────────────────────────────────────

function buildTopPriorities(inputs: AdvisoryInputs): AdvisoryItem[] {
  const { snap, profile, ts, yvm, yourRaisedM } = inputs;
  const priorities: AdvisoryItem[] = [];
  const s = snap.overall_score;
  const blockers = snap.red_flags.filter(f => f.blocking);

  // 1. Critical blockers first (max 1 representative)
  if (blockers.length > 0) {
    const b = blockers[0];
    priorities.push({
      id: `blocker-${b.id}`,
      label: blockers.length === 1 ? b.label : `Fix ${blockers.length} critical blockers`,
      detail: blockers.length === 1
        ? b.reason
        : `${blockers.map(b => b.label).join(", ")} — these are stopping investors before they even look at your numbers.`,
      href: b.href ?? "/metrics",
      severity: "critical",
      tag: "Blocker",
    });
  }

  // 2. No metrics → highest priority
  if (ts.metrics.score === 0) {
    priorities.push({
      id: "missing-metrics",
      label: "Complete Metrics (25% of score)",
      detail: "No revenue, growth, or runway data on record. This is the first thing every investor asks for.",
      href: "/metrics",
      severity: "critical",
      tag: "Metrics",
    });
  }

  // 3. Strong traction but weak pitch
  if (ts.metrics.score >= 60 && ts.pitch.score < 45 && priorities.length < 3) {
    priorities.push({
      id: "pitch-gap",
      label: "Tighten your pitch narrative",
      detail: "Your traction data is strong — but a weak pitch narrative means investors don't fully see the opportunity. This is a missed value-creation lever.",
      href: "/pitch",
      severity: "high",
      tag: "Pitch",
    });
  }

  // 4. Strong traction but weak Q&A
  if (ts.metrics.score >= 60 && ts.qa.score < 45 && priorities.length < 3) {
    priorities.push({
      id: "qa-gap",
      label: "Prepare investor Q&A",
      detail: "Live investor meetings will probe your assumptions, market size, and competitive moat. Unprepared answers kill deals that traction data should have won.",
      href: "/qa",
      severity: "high",
      tag: "Q&A",
    });
  }

  // 5. Aggressive market positioning
  if (yvm.raisedVsP75 === "above" && ts.pitch.score < 65 && priorities.length < 3) {
    priorities.push({
      id: "aggressive-position",
      label: "Justify your above-market raise",
      detail: `You're targeting${yourRaisedM ? ` $${yourRaisedM}M` : " a raise"} above P75 for comparable deals. Investors will need a clear, defensible narrative — your pitch needs to explain the premium.`,
      href: "/pitch",
      severity: "high",
      tag: "Market Position",
    });
  }

  // 6. Missing high-weight tools
  const missing = missingHighWeightTools(ts);
  for (const t of missing.slice(0, 3 - priorities.length)) {
    priorities.push({
      id: `missing-${t}`,
      label: `Complete ${TOOL_LABELS[t]} (${Math.round(WEIGHTS[t] * 100)}% weight)`,
      detail: `${TOOL_LABELS[t]} hasn't been started. It carries ${Math.round(WEIGHTS[t] * 100)}% of your readiness score — investors will notice the gap.`,
      href: TOOL_HREFS[t],
      severity: "high",
      tag: TOOL_LABELS[t],
    });
  }

  // 7. Dataroom if high score
  if (s >= 65 && ts.dataroom.score === 0 && priorities.length < 3) {
    priorities.push({
      id: "missing-dataroom",
      label: "Build your data room",
      detail: "Investors at your readiness level will request documents immediately. Prepare the data room now so you can move fast when conversations start.",
      href: "/dataroom",
      severity: "medium",
      tag: "Data Room",
    });
  }

  // 8. Low runway
  if (profile.runway > 0 && profile.runway < 9 && priorities.length < 3) {
    priorities.push({
      id: "low-runway",
      label: `Extend your runway (${Math.round(profile.runway)} months left)`,
      detail: "Fundraising under pressure weakens your position. With under 9 months of runway, investors know you're not negotiating from strength.",
      href: "/metrics",
      severity: "critical",
      tag: "Runway",
    });
  }

  // 9. Weak tool that's already started
  const weakHighWeight = weakestHighWeightTool(ts);
  if (weakHighWeight && !priorities.find(p => p.href === TOOL_HREFS[weakHighWeight]) && priorities.length < 3) {
    priorities.push({
      id: `weak-${weakHighWeight}`,
      label: `Strengthen ${TOOL_LABELS[weakHighWeight]} (currently ${ts[weakHighWeight].score}/100)`,
      detail: `This is your weakest high-weight tool. Improving it has the highest score leverage right now.`,
      href: TOOL_HREFS[weakHighWeight],
      severity: "medium",
      tag: TOOL_LABELS[weakHighWeight],
    });
  }

  return priorities.slice(0, 3);
}

// ─── Investor challenges ──────────────────────────────────────────────────────

function buildInvestorChallenges(inputs: AdvisoryInputs): AdvisoryItem[] {
  const { snap, profile, ts, yvm, benchmark, yourRaisedM, yourValuationM } = inputs;
  const challenges: AdvisoryItem[] = [];

  function fmtM(v: number) {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    if (v >= 1)    return `$${Math.round(v)}M`;
    return `$${(v * 1000).toFixed(0)}K`;
  }

  // Revenue / traction challenge
  if (ts.metrics.score === 0) {
    challenges.push({
      id: "ch-no-metrics",
      label: "\"What are your actual numbers?\"",
      detail: "Without submitted metrics, you have no credible answer to the most basic investor question. This will end most conversations before they start.",
      href: "/metrics",
      severity: "critical",
      tag: "Traction",
    });
  } else if (profile.mrr > 0 && profile.mrr < 10_000) {
    challenges.push({
      id: "ch-low-mrr",
      label: "\"Your MRR seems low for a Seed ask.\"",
      detail: `At ${fmtMoney(profile.mrr)} MRR, most institutional Seed investors will want to see a clearer path to $50K–$100K before committing. Pre-Seed angels may be a better fit at this stage.`,
      href: "/metrics",
      severity: "high",
      tag: "Traction",
    });
  } else if (profile.growth_rate > 0 && profile.growth_rate < 8) {
    challenges.push({
      id: "ch-low-growth",
      label: "\"Growth looks sluggish — why should we invest now?\"",
      detail: `${fmtPct(profile.growth_rate)} MoM growth is below the 10–15% threshold most Seed investors use as a signal of early product-market fit. Be ready to explain the inflection point.`,
      href: "/metrics",
      severity: "high",
      tag: "Traction",
    });
  }

  // Valuation challenge
  if (yvm.raisedVsP75 === "above" && benchmark.peerCount > 5) {
    challenges.push({
      id: "ch-aggressive-raise",
      label: `"Why are you raising${yourRaisedM ? ` $${yourRaisedM}M` : " this much"} — comparable deals raised far less?"`,
      detail: `Your target raise is above the P75 (${fmtM(benchmark.p75Raised)}) for ${benchmark.peerCount} comparable deals. You need a specific, compelling answer — team pedigree, proprietary tech, or demonstrated outlier traction.`,
      href: "/valuation",
      severity: "high",
      tag: "Valuation",
    });
  } else if (yourValuationM && benchmark.medianValuation && yourValuationM > benchmark.medianValuation * 1.5) {
    challenges.push({
      id: "ch-high-valuation",
      label: "\"How do you justify this valuation?\"",
      detail: `Your pre-money estimate (${fmtM(yourValuationM)}) is significantly above the peer median (${fmtM(benchmark.medianValuation)}). Investors will want to see the assumptions behind your model — unit economics, TAM, and comparable exits.`,
      href: "/valuation",
      severity: "high",
      tag: "Valuation",
    });
  } else if (ts.valuation.score > 0 && ts.valuation.score < 45) {
    challenges.push({
      id: "ch-weak-valuation",
      label: "\"Walk me through your valuation model.\"",
      detail: "A weak valuation score signals that the model is thin or uses assumptions investors won't accept. They'll probe this hard — especially at Series A and above.",
      href: "/valuation",
      severity: "high",
      tag: "Valuation",
    });
  }

  // Pitch / narrative challenge
  if (ts.pitch.score < 50 && ts.pitch.score > 0) {
    challenges.push({
      id: "ch-weak-pitch",
      label: "\"I'm not clear on what makes you different.\"",
      detail: "Investors hear hundreds of pitches. A weak differentiation and competitive moat section will result in polite passes. This needs a sharp, specific answer — not a generic feature list.",
      href: "/pitch",
      severity: "high",
      tag: "Pitch",
    });
  }

  // Q&A challenge
  if (ts.qa.score < 50 && ts.qa.score > 0) {
    challenges.push({
      id: "ch-weak-qa",
      label: "\"Why hasn't this been done before?\"",
      detail: "Q&A score below 50 suggests unprepared answers to standard investor challenges. Expect hard questions on your go-to-market, competitive barriers, and team's right to win.",
      href: "/qa",
      severity: "high",
      tag: "Q&A",
    });
  }

  // Runway challenge
  if (profile.runway > 0 && profile.runway < 12) {
    challenges.push({
      id: "ch-runway",
      label: "\"You're fundraising under pressure — why now?\"",
      detail: `${Math.round(profile.runway)} months of runway puts you in a time-constrained position. Investors know this and will use it in term sheet negotiations. Have a clear answer for why the timing is strategic, not desperate.`,
      href: "/metrics",
      severity: profile.runway < 9 ? "critical" : "high",
      tag: "Runway",
    });
  }

  // Cap table challenge
  if (ts.captable.score > 0 && ts.captable.score < 40) {
    challenges.push({
      id: "ch-captable",
      label: "\"Let's look at your cap table.\"",
      detail: "A fragmented or unusual equity structure raises diligence flags. Investors want clean, founder-controlled tables without awkward vesting cliffs or concentrated angel positions.",
      href: "/captable",
      severity: "medium",
      tag: "Cap Table",
    });
  }

  // No dataroom challenge
  if (ts.dataroom.score === 0 && snap.overall_score >= 50) {
    challenges.push({
      id: "ch-no-dataroom",
      label: "\"Can you send the data room?\"",
      detail: "At this readiness level, investors will ask for documents immediately after the first call. Not having a data room ready signals operational unpreparedness.",
      href: "/dataroom",
      severity: "medium",
      tag: "Data Room",
    });
  }

  // Sector-specific: below median positioning
  if (yvm.raisedVsMedian === "below" && snap.overall_score >= 55) {
    challenges.push({
      id: "ch-below-median",
      label: "\"Why aren't you raising more given your traction?\"",
      detail: "Your raise target is below the market median for comparable deals. Sophisticated investors may question whether you fully understand your own market opportunity or are leaving growth capital on the table.",
      href: "/valuation",
      severity: "low",
      tag: "Market Position",
    });
  }

  return challenges
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity ?? "low"] ?? 3) - (order[b.severity ?? "low"] ?? 3);
    })
    .slice(0, 3);
}

// ─── Next actions ─────────────────────────────────────────────────────────────

function buildNextActions(inputs: AdvisoryInputs): AdvisoryItem[] {
  const { snap, ts } = inputs;
  const s = snap.overall_score;
  const actions: AdvisoryItem[] = [];
  const blockers = snap.red_flags.filter(f => f.blocking);

  // 1. Resolve blockers first
  for (const b of blockers.slice(0, 2)) {
    actions.push({
      id: `action-blocker-${b.id}`,
      label: b.action,
      detail: b.reason,
      href: b.href,
      severity: "critical",
      tag: "Fix now",
    });
  }

  // 2. Missing high-priority tools
  const missing = missingHighWeightTools(ts);
  for (const t of missing.slice(0, Math.max(0, 2 - actions.length))) {
    actions.push({
      id: `action-complete-${t}`,
      label: `Complete ${TOOL_LABELS[t]}`,
      detail: `${TOOL_LABELS[t]} (${Math.round(WEIGHTS[t] * 100)}% weight) has not been started. Complete it to unlock your full score.`,
      href: TOOL_HREFS[t],
      severity: "high",
      tag: "Complete",
    });
  }

  // 3. Improve weakest high-weight tool
  const weakHighWeight = weakestHighWeightTool(ts);
  if (weakHighWeight && !actions.find(a => a.href === TOOL_HREFS[weakHighWeight]) && actions.length < 3) {
    actions.push({
      id: `action-improve-${weakHighWeight}`,
      label: `Strengthen ${TOOL_LABELS[weakHighWeight]}`,
      detail: `Score ${ts[weakHighWeight].score}/100 — highest leverage gap. Improving this has the most impact on your overall readiness.`,
      href: TOOL_HREFS[weakHighWeight],
      severity: "high",
      tag: "Improve",
    });
  }

  // 4. Build data room if high score
  if (s >= 65 && ts.dataroom.score === 0 && actions.length < 3) {
    actions.push({
      id: "action-dataroom",
      label: "Prepare your data room",
      detail: "Investors will request documents right after the first call. Being ready signals professionalism and accelerates deal closure.",
      href: "/dataroom",
      severity: "medium",
      tag: "Prepare",
    });
  }

  // 5. Expert review when strong
  if (s >= 70 && blockers.length === 0 && actions.length < 3) {
    actions.push({
      id: "action-expert",
      label: "Book an expert readiness review",
      detail: "Your score is strong enough to start conversations. Get expert feedback on your pitch and positioning before the first investor meeting.",
      href: CALENDLY_URL,
      severity: "medium",
      tag: "Outreach",
    });
  }

  // 6. Complete remaining tools
  const allMissing = (Object.keys(ts) as FoundationTool[]).filter(t => ts[t].score === 0);
  for (const t of allMissing.slice(0, Math.max(0, 3 - actions.length))) {
    if (!actions.find(a => a.href === TOOL_HREFS[t])) {
      actions.push({
        id: `action-start-${t}`,
        label: `Start ${TOOL_LABELS[t]}`,
        detail: `${TOOL_LABELS[t]} hasn't been started yet. Complete it to build a comprehensive readiness picture.`,
        href: TOOL_HREFS[t],
        severity: "low",
        tag: "Complete",
      });
    }
  }

  return actions.slice(0, 3);
}

// ─── Primary CTA ──────────────────────────────────────────────────────────────

function buildPrimaryCTA(inputs: AdvisoryInputs): AdvisoryCTA {
  const { snap, ts } = inputs;
  const s = snap.overall_score;
  const blockers = snap.red_flags.filter(f => f.blocking);

  if (ts.metrics.score === 0) {
    return { label: "Start with Metrics →", href: "/metrics", description: "The most impactful first step.", variant: "primary" };
  }
  if (blockers.length >= 2) {
    return { label: "Fix critical gaps →", href: blockers[0].href ?? "/metrics", description: `${blockers.length} critical issues are blocking your score.`, variant: "primary" };
  }
  if (s < 40) {
    const missing = missingHighWeightTools(ts);
    const next = missing[0] ?? null;
    return {
      label: next ? `Complete ${TOOL_LABELS[next]} →` : "Keep building →",
      href: next ? TOOL_HREFS[next] : "/metrics",
      description: "Complete more tools to unlock your full readiness score.",
      variant: "primary",
    };
  }
  if (s < 65) {
    const weak = weakestHighWeightTool(ts);
    return {
      label: weak ? `Strengthen ${TOOL_LABELS[weak]} →` : "Strengthen your pitch →",
      href: weak ? TOOL_HREFS[weak] : "/pitch",
      description: "Improving your weakest area has the highest score impact right now.",
      variant: "primary",
    };
  }
  if (s < 80 && ts.dataroom.score === 0) {
    return { label: "Prepare your data room →", href: "/dataroom", description: "Investors will request documents once conversations start.", variant: "primary" };
  }
  if (s >= 75 && blockers.length === 0) {
    return { label: "Book a readiness review →", href: CALENDLY_URL, description: "Your score is strong. Get expert feedback before starting outreach.", variant: "expert", ext: true };
  }

  const weak = weakestHighWeightTool(ts);
  return {
    label: weak ? `Improve ${TOOL_LABELS[weak]} →` : "Continue building →",
    href: weak ? TOOL_HREFS[weak] : "/metrics",
    description: "Keep improving to reach investor-ready status.",
    variant: "primary",
  };
}

function buildSecondaryCTA(inputs: AdvisoryInputs, primaryCTA: AdvisoryCTA): AdvisoryCTA | undefined {
  const { snap } = inputs;
  const s = snap.overall_score;

  // If primary is not expert-focused and score is good, offer expert review
  if (primaryCTA.variant !== "expert" && s >= 60) {
    return { label: "Book a review →", href: CALENDLY_URL, description: "Expert feedback on your fundraising strategy.", variant: "expert", ext: true };
  }
  return undefined;
}

// ─── Data completeness ────────────────────────────────────────────────────────

function dataCompleteness(inputs: AdvisoryInputs): AdvisoryOutput["data_completeness"] {
  const done = completedTools(inputs.ts).length;
  if (done >= 4) return "full";
  if (done >= 2) return "partial";
  return "minimal";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildAdvisory(inputs: AdvisoryInputs): AdvisoryOutput {
  const readiness_summary    = buildReadinessSummary(inputs);
  const recommended_strategy = buildRecommendedStrategy(inputs);
  const top_priorities       = buildTopPriorities(inputs);
  const investor_challenges  = buildInvestorChallenges(inputs);
  const next_actions         = buildNextActions(inputs);
  const primary_cta          = buildPrimaryCTA(inputs);
  const secondary_cta        = buildSecondaryCTA(inputs, primary_cta);

  return {
    readiness_summary,
    recommended_strategy,
    top_priorities,
    investor_challenges,
    next_actions,
    primary_cta,
    secondary_cta,
    data_completeness: dataCompleteness(inputs),
  };
}
