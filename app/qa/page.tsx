"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Save, RotateCcw, Check, AlertTriangle, Info } from "lucide-react";
import { saveQAAssessment } from "@/lib/db-qa";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { saveReadinessSnapshot } from "@/lib/local-readiness";
import { track } from "@/lib/analytics";

// ─── Types & Constants ────────────────────────────────────────────────────────

interface Question {
  category: string;
  q: string;
  weight: number;
  /** What a strong, investor-ready answer looks like. Shown as coaching guidance. */
  hint: string;
}

const SCORE_OPTIONS = [
  { value: 0,   label: "Can't answer", short: "—",       color: "muted"   },
  { value: 25,  label: "Vague",        short: "Vague",   color: "danger"  },
  { value: 50,  label: "Partial",      short: "Partial", color: "warning" },
  { value: 75,  label: "Strong",       short: "Strong",  color: "accent"  },
  { value: 100, label: "Sharp",        short: "Sharp",   color: "success" },
] as const;

/** Investor objection surfaced when a category scores ≤ 50. */
const CATEGORY_OBJECTIONS: Record<string, string> = {
  "Problem":        "We're not convinced this is a real, urgent, and large-enough problem worth funding.",
  "Solution":       "The value proposition isn't clear. We don't understand why someone would switch from today's solution.",
  "Market":         "The market size doesn't hold up. We can't underwrite the opportunity at this stage.",
  "Traction":       "There's insufficient evidence of product-market fit. Come back with stronger proof of demand.",
  "Go-to-Market":   "The customer acquisition strategy isn't credible. The motion doesn't feel repeatable yet.",
  "Competition":    "The competitive landscape isn't fully understood. Incumbents may be more threatening than presented.",
  "Moat":           "There's no durable advantage. A well-funded player could replicate this in 12–18 months.",
  "Business Model": "We don't understand how this scales profitably. Unit economics and margins are unclear.",
  "Team":           "We like the opportunity but aren't confident this team can execute it to a meaningful outcome.",
  "Fundraising":    "The raise rationale isn't well-grounded. The milestones aren't specific or measurable enough.",
};

const CATEGORY_ORDER = [
  "Problem", "Solution", "Market", "Traction",
  "Go-to-Market", "Competition", "Moat", "Business Model", "Team", "Fundraising",
];

// ─── Question Bank (30 questions · 10 categories · 3 per category) ───────────

const allQuestions: Question[] = [
  // ── Problem ──────────────────────────────────────────────────────────────
  {
    category: "Problem",
    q: "Who exactly has this problem, and what evidence do you have they're actively trying to solve it?",
    weight: 1.2,
    hint: "Name a specific customer segment — not 'everyone.' Back it with a data point, direct customer quote, or behavioral evidence proving active pain.",
  },
  {
    category: "Problem",
    q: "What does it cost them today — in time, money, or missed opportunity — to live with this problem?",
    weight: 1.1,
    hint: "Quantify the cost. How much money or time does this problem consume per customer per year? Investors want a number, not a narrative.",
  },
  {
    category: "Problem",
    q: "Why hasn't this been solved already, and what's changed recently that makes it solvable now?",
    weight: 1.3,
    hint: "Cite a specific shift: regulatory, technological, behavioral, or infrastructural. 'Mobile penetration hit 70%' counts. 'The time is right' does not.",
  },

  // ── Solution ─────────────────────────────────────────────────────────────
  {
    category: "Solution",
    q: "In one or two sentences: what does your product do, for whom, and what outcome does it deliver?",
    weight: 1.2,
    hint: "'[Product] helps [ICP] to [outcome] by [mechanism].' Test it on a stranger — if they don't immediately get it, the pitch will fail.",
  },
  {
    category: "Solution",
    q: "Why is your approach fundamentally better than what exists, and what would it take to replicate it?",
    weight: 1.3,
    hint: "Compare directly: 'Unlike X, we Y because Z.' Avoid '10x better' without evidence. Name the structural reason you win and why it's hard to copy.",
  },
  {
    category: "Solution",
    q: "What would a customer have to give up to switch back to their previous solution?",
    weight: 1.0,
    hint: "Describe switching costs: data lock-in, trained workflows, integrations, or embedded relationships. The higher the cost to leave, the stickier the product.",
  },

  // ── Market ───────────────────────────────────────────────────────────────
  {
    category: "Market",
    q: "Walk me through your TAM, SAM, and SOM — and the methodology behind each number.",
    weight: 1.4,
    hint: "Bottom-up is stronger than top-down: # of addressable customers × ACV. Name your source and show the math. Avoid pulling numbers from a market report without justification.",
  },
  {
    category: "Market",
    q: "Is this market growing, shrinking, or shifting? What's driving that trend and at what rate?",
    weight: 1.1,
    hint: "State a CAGR and what's driving it. In Africa/MENA, regulatory tailwinds, mobile penetration, and infrastructure shifts are credible growth drivers.",
  },
  {
    category: "Market",
    q: "Which customer segment are you targeting first, and why is that the right entry point?",
    weight: 1.0,
    hint: "Name your beachhead: specific geography, company size, or job function. Explain why this segment is the wedge into the broader market.",
  },

  // ── Traction ─────────────────────────────────────────────────────────────
  {
    category: "Traction",
    q: "What are your headline metrics right now — revenue, users, retention — and what's the trend?",
    weight: 1.5,
    hint: "Give actual numbers with a trend: 'MRR is $X, up from $Y three months ago.' If pre-revenue, cite signed LOIs, active pilots, or waitlist with conversion rates.",
  },
  {
    category: "Traction",
    q: "What is your month-over-month growth rate, and what's been driving it?",
    weight: 1.4,
    hint: "Give the actual number: '15% MoM for 5 months.' Name the driver — organic vs. paid vs. partnership. Investors distinguish between one-time spikes and sustained momentum.",
  },
  {
    category: "Traction",
    q: "What is the single strongest proof point that customers are getting real value from your product?",
    weight: 1.3,
    hint: "NPS score, renewal rate, a customer ROI case study, or a reference customer quote. One compelling proof point beats ten weak ones.",
  },

  // ── Go-to-Market ─────────────────────────────────────────────────────────
  {
    category: "Go-to-Market",
    q: "How are you acquiring customers today, and what makes that motion repeatable and scalable?",
    weight: 1.3,
    hint: "Name the channel (inbound, outbound, partnerships, PLG). Show the unit economics. Explain what needs to be true for this to scale 10×.",
  },
  {
    category: "Go-to-Market",
    q: "What is your CAC, payback period, and LTV — and how do those compare to industry benchmarks?",
    weight: 1.2,
    hint: "Give actual numbers, even rough estimates. Acknowledge what you don't have yet — but show you understand which metrics govern your business model.",
  },
  {
    category: "Go-to-Market",
    q: "What does your sales cycle look like — who initiates, who evaluates, and who approves?",
    weight: 1.0,
    hint: "Map the buyer journey end to end. Enterprise and SMB have very different cycles. How long does a deal take from first contact to closed? What causes deals to stall?",
  },

  // ── Competition ──────────────────────────────────────────────────────────
  {
    category: "Competition",
    q: "Name your top 3 competitors and explain specifically why customers choose you over each of them.",
    weight: 1.3,
    hint: "Be specific. Don't say 'no direct competitors' — every problem has an incumbent solution. Name them and articulate the positioning delta.",
  },
  {
    category: "Competition",
    q: "Where do you lose deals, and to whom? What does that tell you about your current positioning?",
    weight: 1.1,
    hint: "This is the most revealing answer in a pitch. Showing you've studied loss patterns demonstrates market intelligence, self-awareness, and strategic discipline.",
  },
  {
    category: "Competition",
    q: "If a well-funded competitor entered your exact space tomorrow, what would you do?",
    weight: 1.0,
    hint: "'Move faster' is not a strategy. Name two structural advantages — embedded data, distribution lock-in, proprietary relationships — that protect your position.",
  },

  // ── Moat ─────────────────────────────────────────────────────────────────
  {
    category: "Moat",
    q: "What is your durable competitive advantage — what will make you hard to displace 3 years from now?",
    weight: 1.5,
    hint: "Pick one primary moat type: proprietary data, network effects, switching costs, regulatory position, or distribution. Explain how it gets stronger, not weaker, as you grow.",
  },
  {
    category: "Moat",
    q: "Do you have network effects, proprietary data, or switching costs that compound as you scale?",
    weight: 1.4,
    hint: "Be specific: 'Each new user adds N data points to our scoring model' or 'Clients train 40+ staff on our platform — migration would cost them 6 months of productivity.'",
  },
  {
    category: "Moat",
    q: "What do you know about this market that your competitors don't — and can't easily learn?",
    weight: 1.2,
    hint: "Talk about insight, not effort. Proprietary knowledge from years of operating, closed-door relationships, or unique data access is a genuine moat.",
  },

  // ── Business Model ────────────────────────────────────────────────────────
  {
    category: "Business Model",
    q: "Explain your revenue model: how you charge, what you charge, and why that pricing is defensible.",
    weight: 1.2,
    hint: "Name the model (per seat, usage-based, take rate, subscription) and explain the pricing logic. Why does this align price with value delivered to the customer?",
  },
  {
    category: "Business Model",
    q: "What are your gross margins today, and how do they evolve at scale?",
    weight: 1.3,
    hint: "Know your benchmark: SaaS 70–85%; marketplace 30–50%; logistics/hardware 20–40%. Explain what structural factors drive margin improvement as volume increases.",
  },
  {
    category: "Business Model",
    q: "What's your path to profitability — what revenue milestone gets you there, and by when?",
    weight: 1.1,
    hint: "Define a specific breakeven milestone: 'At $X ARR with Y headcount, we reach cash-flow neutrality.' Investors want the math, not the aspiration.",
  },

  // ── Team ─────────────────────────────────────────────────────────────────
  {
    category: "Team",
    q: "Why is this specific team uniquely positioned to win this market?",
    weight: 1.3,
    hint: "Avoid generic founder bios. Explain why your background gives you insight, access, or credibility that others don't have. Unfair advantages beat hard work.",
  },
  {
    category: "Team",
    q: "What domain expertise or unfair advantages does the team bring to this problem?",
    weight: 1.2,
    hint: "Be specific: '5 years as country manager at a competing logistics platform' or '2 years building credit-scoring infrastructure for African telcos.'",
  },
  {
    category: "Team",
    q: "What's the most critical gap on your team right now, and how are you addressing it?",
    weight: 0.9,
    hint: "Show self-awareness — investors respect founders who know their limits. Name the gap (e.g., country sales lead), the plan, and the timeline.",
  },

  // ── Fundraising ───────────────────────────────────────────────────────────
  {
    category: "Fundraising",
    q: "How much are you raising and why is that specific amount right for this stage?",
    weight: 1.1,
    hint: "'We need $2M to hire 4 people and reach $300K MRR in 18 months.' Reverse-engineer from milestones, not from what you want or what feels normal.",
  },
  {
    category: "Fundraising",
    q: "What are the 3 concrete milestones this round is designed to get you to?",
    weight: 1.2,
    hint: "Name measurable outcomes: revenue target, customer count, product launch. Avoid vague ones like 'establish market presence' or 'build awareness.'",
  },
  {
    category: "Fundraising",
    q: "What does your current cap table look like, and are there any investor or term concerns to flag?",
    weight: 0.9,
    hint: "Investors want a clean, simple structure. Proactively disclose SAFEs, convertible notes, or complicated terms — surprises kill deals faster than bad news.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupQuestions(questions: Question[]) {
  const map: Record<string, Question[]> = {};
  for (const q of questions) {
    if (!map[q.category]) map[q.category] = [];
    map[q.category].push(q);
  }
  return CATEGORY_ORDER.map((title) => ({
    title,
    questions: map[title] ?? [],
  })).filter((g) => g.questions.length > 0);
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Investor-ready";
  if (score >= 65) return "Well prepared";
  if (score >= 45) return "Needs sharpening";
  return "Significant gaps";
}

function scoreBadgeVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 65) return "success";
  if (score >= 45) return "warning";
  return "danger";
}

const COMPLETION_THRESHOLD = Math.ceil(allQuestions.length * 0.7); // 21 of 30

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionScoreRow({
  question,
  score,
  answered,
  onScore,
}: {
  question: Question;
  score: number;
  answered: boolean;
  onScore: (score: number) => void;
}) {
  const isWeak = answered && score <= 50;
  const isStrong = answered && score >= 75;

  return (
    <div
      className={`rounded-[var(--radius-sm)] border p-4 transition-colors ${
        isWeak
          ? "bg-warning/5 border-warning/20"
          : isStrong
          ? "bg-success/5 border-success/20"
          : "bg-soft border-border"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Question text */}
        <p className="text-sm font-medium leading-relaxed">{question.q}</p>

        {/* Score buttons */}
        <div className="flex flex-wrap gap-1.5">
          {SCORE_OPTIONS.map((opt) => {
            const isActive = answered && score === opt.value;
            let activeCls = "";
            if (isActive) {
              if (opt.value === 0)   activeCls = "bg-muted/30 text-muted border-muted/40";
              else if (opt.value <= 25)  activeCls = "bg-danger text-white border-danger";
              else if (opt.value <= 50)  activeCls = "bg-warning text-white border-warning";
              else if (opt.value <= 75)  activeCls = "bg-accent text-white border-accent";
              else                       activeCls = "bg-success text-white border-success";
            }

            return (
              <button
                key={opt.value}
                onClick={() => onScore(opt.value)}
                title={opt.label}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                  isActive
                    ? activeCls
                    : "bg-background border-border text-muted hover:bg-soft hover:text-foreground"
                }`}
              >
                {opt.short}
              </button>
            );
          })}
        </div>

        {/* Hint — shown when weak or unanswered */}
        {(!answered || isWeak) && (
          <p
            className={`text-xs leading-relaxed flex items-start gap-1.5 ${
              isWeak ? "text-warning/90" : "text-muted"
            }`}
          >
            <Info className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
            <span>{question.hint}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function InvestorReadinessReport({
  responses,
}: {
  responses: Record<string, number>;
}) {
  // Questions that were answered with a weak score
  const weakItems = allQuestions
    .filter((q) => q.q in responses && (responses[q.q] ?? 0) <= 50)
    .sort((a, b) => (responses[a.q] ?? 0) - (responses[b.q] ?? 0))
    .slice(0, 5);

  const weakCategories = [...new Set(weakItems.map((q) => q.category))];

  if (weakItems.length === 0) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-[var(--radius-lg)] p-5 flex items-start gap-3">
        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-success mb-1">Strong across the board</p>
          <p className="text-sm text-muted">
            No significant weak spots detected. Before pitching, focus on sharpening every answer
            with concrete data points, specific numbers, and a memorable example per category.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-soft border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <div>
          <span className="text-sm font-semibold">Investor Readiness Report</span>
          <span className="text-xs text-muted ml-2">
            {weakItems.length} weak area{weakItems.length === 1 ? "" : "s"} — address these before your next meeting
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">

        {/* Col 1: Weakest questions */}
        <div className="p-5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Top Weaknesses</p>
          <div className="space-y-3">
            {weakItems.map((item, i) => {
              const s = responses[item.q] ?? 0;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                      s === 0
                        ? "bg-muted/20 text-muted"
                        : s <= 25
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {s === 0 ? "—" : s}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider leading-none mb-0.5">
                      {item.category}
                    </p>
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{item.q}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2: Likely investor objections */}
        <div className="p-5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Likely Investor Objections</p>
          <div className="space-y-2.5">
            {weakCategories.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-ink-secondary leading-snug">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                {CATEGORY_OBJECTIONS[cat]}
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: What to fix */}
        <div className="p-5">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Priority Actions</p>
          <div className="space-y-3">
            {weakItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-snug">
                <span className="mt-0.5 shrink-0 text-muted font-bold">→</span>
                <p className="text-ink-secondary">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QAPage() {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [perspective, setPerspective] = useState<"founder" | "investor">("founder");
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);
  const trackedOpen = useRef(false);

  useEffect(() => {
    if (!trackedOpen.current) {
      trackedOpen.current = true;
      track("tool_opened", { tool: "qa" });
    }
  }, []);

  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    try {
      const raw = localStorage.getItem("vcready_qa_inputs");
      if (raw) {
        const data = JSON.parse(raw) as {
          responses?: Record<string, number>;
          perspective?: "founder" | "investor";
        };
        if (data.responses && Object.keys(data.responses).length > 0) {
          setResponses(data.responses);
        }
        if (data.perspective) setPerspective(data.perspective);
      }
    } catch {
      // ignore
    }

    getToolFromDB("qa").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as {
        responses?: Record<string, number>;
        perspective?: "founder" | "investor";
      };
      if (inp.responses && Object.keys(inp.responses).length > 0) {
        setResponses(inp.responses);
      }
      if (inp.perspective) setPerspective(inp.perspective);
    });
  }, []);

  const categories = useMemo(() => groupQuestions(allQuestions), []);

  const notifyFoundationRefresh = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  };

  const scores = useMemo(() => {
    const categoryScores: Record<string, number> = {};
    let totalWeightedScore = 0;
    let totalMaxScore = 0;

    for (const category of categories) {
      let catScore = 0;
      let catMax = 0;

      for (const q of category.questions) {
        const response = responses[q.q] ?? 0;
        const weighted = (response / 100) * q.weight * 100;
        catScore += weighted;
        catMax += q.weight * 100;
        totalWeightedScore += weighted;
        totalMaxScore += q.weight * 100;
      }

      categoryScores[category.title] =
        catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
    }

    const baseScore =
      totalMaxScore > 0 ? Math.round((totalWeightedScore / totalMaxScore) * 100) : 0;

    let overallScore = baseScore;
    if (perspective === "investor") {
      // Investor view: heavily weight traction & market signal, defensibility matters too
      const traction = categoryScores["Traction"]       ?? 0;
      const market   = categoryScores["Market"]         ?? 0;
      const moat     = categoryScores["Moat"]           ?? 0;
      const comp     = categoryScores["Competition"]    ?? 0;
      overallScore = Math.round(
        traction * 0.28 + market * 0.20 + moat * 0.15 + comp * 0.12 + baseScore * 0.25
      );
    }

    return { categoryScores, overallScore };
  }, [responses, perspective, categories]);

  const answeredCount = useMemo(() => Object.keys(responses).length, [responses]);
  const totalQuestions = allQuestions.length;
  const isComplete = answeredCount >= COMPLETION_THRESHOLD;

  useEffect(() => {
    if (isComplete) {
      markStepComplete("qa");
      setCompletedSteps(getCompletedSteps());
    }
  }, [isComplete]);

  const handleSave = useCallback(async () => {
    try {
      await saveQAAssessment({
        name: `qa_assessment_${new Date().toISOString()}`,
        total_score: scores.overallScore,
        category_scores: scores.categoryScores,
        responses,
        perspective,
      });
    } catch (error) {
      console.error("[qa] Error saving QA assessment:", error);
    }

    localStorage.setItem(
      "vcready_qa",
      JSON.stringify({
        score: scores.overallScore,
        category_scores: scores.categoryScores,
        answered_count: answeredCount,
        total_questions: totalQuestions,
        perspective,
        saved_at: new Date().toISOString(),
      })
    );

    localStorage.setItem(
      "vcready_qa_inputs",
      JSON.stringify({ responses, perspective })
    );

    saveReadinessSnapshot();

    saveToolToDB("qa", scores.overallScore, {
      responses: responses as unknown as Record<string, unknown>,
      perspective,
      derived: {
        category_scores: scores.categoryScores as unknown as Record<string, unknown>,
        answered_count: answeredCount,
        total_questions: totalQuestions,
        completion_rate: Math.round((answeredCount / totalQuestions) * 100),
      } as unknown as Record<string, unknown>,
    }).catch(console.error);

    notifyFoundationRefresh();

    track("tool_saved", { tool: "qa", score: scores.overallScore });
    track("qa_saved", { score: scores.overallScore, perspective });
    if (scores.overallScore >= 70)
      track("tool_completed", { tool: "qa", score: scores.overallScore });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [scores, responses, perspective, answeredCount, totalQuestions]);

  const handleReset = useCallback(() => {
    setResponses({});
    setSaved(false);
  }, []);

  const completionPct = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <ToolPageLayout
      kicker="Investor Q&A Simulator"
      title="Prepare for every hard question."
      description="30 questions investors actually ask at early-stage meetings. Score your preparedness honestly, get coaching hints for weak areas, and surface the objections you need to neutralise before pitching."
    >
      <FlowProgress currentStep="qa" completedSteps={completedSteps} />

      {/* ── Perspective toggle ─────────────────────────────────────────────── */}
      <ToolSection>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm text-muted shrink-0">Scoring perspective:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={perspective === "founder" ? "primary" : "secondary"}
              onClick={() => setPerspective("founder")}
            >
              Founder
            </Button>
            <Button
              size="sm"
              variant={perspective === "investor" ? "primary" : "secondary"}
              onClick={() => setPerspective("investor")}
            >
              Investor
            </Button>
          </div>
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <div
            className={`rounded-[var(--radius-md)] p-3 border text-xs leading-relaxed transition-colors ${
              perspective === "founder"
                ? "bg-accent/5 border-accent/30 text-ink"
                : "bg-soft border-border text-muted"
            }`}
          >
            <span className="font-semibold block mb-0.5">Founder view</span>
            Balanced self-assessment across all categories. Useful for identifying gaps before live conversations.
          </div>
          <div
            className={`rounded-[var(--radius-md)] p-3 border text-xs leading-relaxed transition-colors ${
              perspective === "investor"
                ? "bg-accent/5 border-accent/30 text-ink"
                : "bg-soft border-border text-muted"
            }`}
          >
            <span className="font-semibold block mb-0.5">Investor view</span>
            Reweights toward traction, market, moat, and competition — the four areas that determine early-stage conviction.
          </div>
        </div>
      </ToolSection>

      {/* ── Score summary ──────────────────────────────────────────────────── */}
      <ToolSection title="Readiness Score">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 mb-4">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
              {scores.overallScore}
              <span className="text-muted text-xl">/100</span>
            </p>
            <p className="text-sm text-ink-secondary">
              {answeredCount} of {totalQuestions} answered
              {answeredCount < COMPLETION_THRESHOLD && (
                <span className="text-muted ml-2">
                  ({COMPLETION_THRESHOLD - answeredCount} more to complete)
                </span>
              )}
            </p>
          </div>
          <Badge variant={scoreBadgeVariant(scores.overallScore)}>
            {scoreLabel(scores.overallScore)}
          </Badge>
        </div>
        <ProgressBar
          value={scores.overallScore}
          status={
            scores.overallScore >= 65 ? "good"
            : scores.overallScore >= 45 ? "warning"
            : "danger"
          }
        />
      </ToolSection>

      {/* ── Category breakdown ─────────────────────────────────────────────── */}
      <ToolSection title="Category Breakdown">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((category) => {
            const catScore = scores.categoryScores[category.title] ?? 0;
            const catAnswered = category.questions.filter(
              (q) => q.q in responses
            ).length;
            return (
              <div
                key={category.title}
                className="bg-soft border border-border rounded-[var(--radius-md)] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold">{category.title}</h4>
                    <p className="text-[11px] text-muted">
                      {catAnswered}/{category.questions.length} answered
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold">{catScore}/100</span>
                </div>
                <ProgressBar
                  value={catScore}
                  status={catScore >= 65 ? "good" : catScore >= 45 ? "warning" : "danger"}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      </ToolSection>

      {/* ── Readiness report (after 70% answered) ─────────────────────────── */}
      {isComplete && (
        <ToolSection title="Readiness Report">
          <InvestorReadinessReport responses={responses} />
        </ToolSection>
      )}

      {/* ── Questions by category ──────────────────────────────────────────── */}
      {categories.map((category) => (
        <ToolSection key={category.title} title={category.title}>
          <div className="space-y-3">
            {category.questions.map((question) => (
              <QuestionScoreRow
                key={question.q}
                question={question}
                score={responses[question.q] ?? 0}
                answered={question.q in responses}
                onScore={(score) =>
                  setResponses((prev) => ({ ...prev, [question.q]: score }))
                }
              />
            ))}
          </div>
        </ToolSection>
      ))}

      {/* ── Save bar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-[var(--radius-lg)] p-4 sm:p-6">
        <div>
          <p className="text-sm text-muted">
            {answeredCount}/{totalQuestions} questions evaluated
            {answeredCount > 0 && (
              <span className="ml-2 text-xs">({completionPct}% complete)</span>
            )}
          </p>
          {!isComplete && answeredCount > 0 && (
            <p className="text-xs text-muted mt-0.5">
              Answer {COMPLETION_THRESHOLD - answeredCount} more to unlock the Readiness Report
            </p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleReset} variant="secondary" size="sm" className="flex-1 sm:flex-none">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleSave} size="sm" className="flex-1 sm:flex-none">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved" : "Save Assessment"}
          </Button>
        </div>
      </div>

      <FlowContinue isComplete={isComplete} nextHref="/captable" nextLabel="Cap Table" />
    </ToolPageLayout>
  );
}
