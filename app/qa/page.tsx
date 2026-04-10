"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Save, RotateCcw, Check } from "lucide-react";
import { saveQAAssessment } from "@/lib/db-qa";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { saveReadinessSnapshot } from "@/lib/local-readiness";

const allQuestions = [
  { category: "Business Model", q: "How do you make money?", weight: 1.2 },
  { category: "Business Model", q: "What is your pricing model?", weight: 1.0 },
  { category: "Business Model", q: "What are your unit economics?", weight: 1.3 },
  { category: "Business Model", q: "What is your path to profitability?", weight: 1.1 },
  { category: "Market & Competition", q: "How big is your market (TAM/SAM/SOM)?", weight: 1.4 },
  { category: "Market & Competition", q: "Who are your main competitors?", weight: 1.0 },
  { category: "Market & Competition", q: "What is your competitive advantage?", weight: 1.5 },
  { category: "Market & Competition", q: "Why now?", weight: 1.2 },
  { category: "Traction & Metrics", q: "What is your current MRR/ARR?", weight: 1.3 },
  { category: "Traction & Metrics", q: "What is your growth rate?", weight: 1.2 },
  { category: "Traction & Metrics", q: "What is your churn rate?", weight: 1.0 },
  { category: "Traction & Metrics", q: "What is your CAC and LTV?", weight: 1.1 },
  { category: "Team & Operations", q: "Why is your team the right one?", weight: 1.3 },
  { category: "Team & Operations", q: "What are your key hires?", weight: 0.9 },
  { category: "Team & Operations", q: "How did the founders meet?", weight: 0.7 },
  { category: "Team & Operations", q: "What is your culture?", weight: 0.6 },
  { category: "Fundraising", q: "How much are you raising?", weight: 1.0 },
  { category: "Fundraising", q: "What will you use the funds for?", weight: 1.1 },
  { category: "Fundraising", q: "What is your valuation expectation?", weight: 1.2 },
  { category: "Fundraising", q: "Who else is investing?", weight: 0.8 },
];

interface Question { category: string; q: string; weight: number }

function groupQuestions(questions: Question[]) {
  const grouped = questions.reduce((acc: Record<string, Question[]>, q) => {
    if (!acc[q.category]) {
      acc[q.category] = [];
    }
    acc[q.category].push(q);
    return acc;
  }, {});

  return Object.entries(grouped).map(([title, questions]) => ({
    title,
    count: questions.length,
    questions: questions,
  }));
}

export default function QAPage() {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [perspective, setPerspective] = useState<"founder" | "investor">("founder");
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);

  // Restore saved responses and perspective on mount
  useEffect(() => {
    setCompletedSteps(getCompletedSteps());
    try {
      const raw = localStorage.getItem("vcready_qa_inputs");
      if (raw) {
        const data = JSON.parse(raw) as { responses?: Record<string, number>; perspective?: "founder" | "investor" };
        if (data.responses && Object.keys(data.responses).length > 0) setResponses(data.responses);
        if (data.perspective) setPerspective(data.perspective);
      }
    } catch { /* ignore */ }
    // DB restore
    getToolFromDB("qa").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as { responses?: Record<string, number>; perspective?: "founder" | "investor" };
      if (inp.responses && Object.keys(inp.responses).length > 0) setResponses(inp.responses);
      if (inp.perspective) setPerspective(inp.perspective);
    });
  }, []);

  useEffect(() => {
    if (saved) {
      markStepComplete("qa");
      setCompletedSteps(getCompletedSteps());
    }
  }, [saved]);

  const categories = useMemo(() => groupQuestions(allQuestions), []);
  
  const scores = useMemo(() => {
    const categoryScores: Record<string, number> = {};
    let totalWeightedScore = 0;
    let totalMaxScore = 0;

    // Calculate scores: responses are 0-100, multiply by weight to get weighted score
    for (const category of categories) {
      let categoryTotalScore = 0;
      let categoryTotalMaxScore = 0;

      for (const q of category.questions) {
        const qIndex = allQuestions.findIndex(aq => aq.q === q.q);
        const response = responses[q.q] || 0; // 0-100 scale
        const weight = allQuestions[qIndex].weight;

        // Score contribution = (response/100) * weight * 100 to get 0-100 scale
        const weighted = (response / 100) * weight * 100;
        categoryTotalScore += weighted;
        
        // Max possible = weight * 100
        categoryTotalMaxScore += weight * 100;
        
        totalWeightedScore += weighted;
        totalMaxScore += weight * 100;
      }

      // Category score: normalize to 0-100
      categoryScores[category.title] = categoryTotalMaxScore > 0 ? Math.round((categoryTotalScore / categoryTotalMaxScore) * 100) : 0;
    }

    // Overall base score: normalize to 0-100
    const baseScore = totalMaxScore > 0 ? Math.round((totalWeightedScore / totalMaxScore) * 100) : 0;

    // Investor perspective: emphasize metrics and market (these are most important to investors)
    let overallScore = baseScore;
    if (perspective === "investor") {
      const tractionScore = categoryScores["Traction & Metrics"] || 0;
      const marketScore = categoryScores["Market & Competition"] || 0;
      // Investor weighting: 35% traction, 25% market, 40% other
      overallScore = Math.round(
        tractionScore * 0.35 + 
        marketScore * 0.25 + 
        baseScore * 0.4
      );
    }

    return { categoryScores, overallScore };
  }, [responses, perspective, categories]);

  const answeredCount = useMemo(() => Object.keys(responses).length, [responses]);
  const totalQuestions = allQuestions.length;

  const handleSave = useCallback(async () => {
    try {
      await saveQAAssessment({
        name: `qa_assessment_${new Date().toISOString()}`,
        total_score: scores.overallScore,
        category_scores: scores.categoryScores,
        responses: responses,
        perspective: perspective,
      });
    } catch (error) {
      console.error("[v0] Error saving QA assessment:", error);
    }
    // Persist score and full inputs for restoration on back-navigation
    localStorage.setItem("vcready_qa", JSON.stringify({ score: scores.overallScore }));
    localStorage.setItem("vcready_qa_inputs", JSON.stringify({ responses, perspective }));
    saveReadinessSnapshot();
    saveToolToDB("qa", scores.overallScore, { responses: responses as unknown as Record<string, unknown>, perspective }).catch(console.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [scores, responses, perspective]);

  const handleReset = useCallback(() => {
    setResponses({});
    setSaved(false);
  }, []);

  return (
    <ToolPageLayout
      kicker="Q&A Preparation"
      title="Be ready for every question."
      description="The 50+ questions investors will ask. Prepare your answers and identify gaps in your story."
    >
      <FlowProgress currentStep="qa" completedSteps={completedSteps} />
      {/* Perspective Toggle */}
      <ToolSection>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm text-muted shrink-0">Evaluation perspective:</span>
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
        {/* Perspective explanation */}
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <div className={`rounded-[var(--radius-md)] p-3 border text-xs leading-relaxed transition-colors ${perspective === "founder" ? "bg-accent/5 border-accent/30 text-ink" : "bg-soft border-border text-muted"}`}>
            <span className="font-semibold block mb-0.5">Founder view</span>
            Self-assessment — how you rate your own answers. Use this to identify gaps in your preparation.
          </div>
          <div className={`rounded-[var(--radius-md)] p-3 border text-xs leading-relaxed transition-colors ${perspective === "investor" ? "bg-accent/5 border-accent/30 text-ink" : "bg-soft border-border text-muted"}`}>
            <span className="font-semibold block mb-0.5">Investor view</span>
            Applies VC weights — traction and market score 60% of the total. See how a VC would evaluate your answers.
          </div>
        </div>
      </ToolSection>

      {/* Progress Overview */}
      <ToolSection title="Assessment Progress">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight mb-1">
              {scores.overallScore}<span className="text-muted text-xl">/100</span>
            </p>
            <p className="text-sm text-ink-secondary">{answeredCount} of {totalQuestions} answered</p>
          </div>
          <Badge variant={scores.overallScore >= 70 ? "success" : scores.overallScore >= 50 ? "warning" : "danger"}>
            {scores.overallScore >= 70 ? "Well prepared" : scores.overallScore >= 50 ? "Moderately prepared" : "Needs work"}
          </Badge>
        </div>
        <ProgressBar
          value={scores.overallScore}
          status={scores.overallScore >= 70 ? "good" : scores.overallScore >= 50 ? "warning" : "danger"}
        />
      </ToolSection>

      {/* Category Scores */}
      <ToolSection title="Category Breakdown">
        <div className="grid md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <div key={category.title} className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">{category.title}</h4>
                <span className="text-sm font-mono font-bold">{scores.categoryScores[category.title] || 0}/100</span>
              </div>
              <ProgressBar
                value={scores.categoryScores[category.title] || 0}
                status={(scores.categoryScores[category.title] || 0) >= 70 ? "good" : (scores.categoryScores[category.title] || 0) >= 50 ? "warning" : "danger"}
                size="sm"
              />
            </div>
          ))}
        </div>
      </ToolSection>

      {/* Question Categories */}
      {categories.map((category) => (
        <ToolSection key={category.title} title={category.title}>
          <div className="space-y-3">
            {category.questions.map((question) => (
              <QuestionScoreRow
                key={question.q}
                question={question.q}
                score={responses[question.q] || 0}
                onScore={(score) => {
                  setResponses(prev => ({
                    ...prev,
                    [question.q]: score,
                  }));
                }}
              />
            ))}
          </div>
        </ToolSection>
      ))}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-[var(--radius-lg)] p-6">
        <p className="text-sm text-muted">
          {answeredCount}/{totalQuestions} questions evaluated
        </p>
        <div className="flex gap-2">
          <Button onClick={handleReset} variant="secondary" size="sm">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleSave} size="sm">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved" : "Save Assessment"}
          </Button>
        </div>
      </div>
      <FlowContinue isComplete={completedSteps.includes("qa")} nextHref="/captable" nextLabel="Cap Table" />
    </ToolPageLayout>
  );
}

function QuestionScoreRow({
  question,
  score,
  onScore,
}: {
  question: string;
  score: number;
  onScore: (score: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] bg-soft border border-border p-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{question}</p>
      </div>
      <div className="flex gap-2">
        {[0, 25, 50, 75, 100].map((value) => (
          <button
            key={value}
            onClick={() => onScore(value)}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors ${
              score === value
                ? "bg-accent text-white"
                : "bg-background border border-border text-muted hover:bg-soft"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
