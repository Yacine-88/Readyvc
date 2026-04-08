"use client";

import { useState, useMemo, useCallback } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Save, RotateCcw, Check } from "lucide-react";
import { saveQAAssessment } from "@/lib/db-qa";

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

function groupQuestions(questions: any[]) {
  const grouped = questions.reduce((acc: any, q) => {
    if (!acc[q.category]) {
      acc[q.category] = [];
    }
    acc[q.category].push(q);
    return acc;
  }, {});

  return Object.entries(grouped).map(([title, questions]: any) => ({
    title,
    count: questions.length,
    questions: questions,
  }));
}

export default function QAPage() {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [perspective, setPerspective] = useState<"founder" | "investor">("founder");
  const [saved, setSaved] = useState(false);

  const categories = useMemo(() => groupQuestions(allQuestions), []);
  
  const scores = useMemo(() => {
    const categoryScores: Record<string, number> = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const category of categories) {
      let categoryScore = 0;
      let categoryWeight = 0;

      for (const q of category.questions) {
        const qIndex = allQuestions.findIndex(aq => aq.q === q.q);
        const response = responses[q.q] || 0;
        const weight = allQuestions[qIndex].weight;

        categoryScore += response * weight;
        categoryWeight += weight;
        totalWeightedScore += response * weight;
        totalWeight += weight;
      }

      categoryScores[category.title] = categoryWeight > 0 ? Math.round((categoryScore / categoryWeight) * 100) : 0;
    }

    const overallScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;

    // Investor perspective adjusts scoring based on metrics and market
    if (perspective === "investor") {
      const investorBias = (categoryScores["Traction & Metrics"] || 0) * 0.3 + (categoryScores["Market & Competition"] || 0) * 0.2;
      return {
        categoryScores,
        overallScore: Math.round(overallScore * 0.7 + investorBias * 0.3),
      };
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[v0] Error saving QA assessment:", error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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
      {/* Perspective Toggle */}
      <ToolSection>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Evaluation perspective:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={perspective === "founder" ? "default" : "secondary"}
              onClick={() => setPerspective("founder")}
            >
              Founder
            </Button>
            <Button
              size="sm"
              variant={perspective === "investor" ? "default" : "secondary"}
              onClick={() => setPerspective("investor")}
            >
              Investor
            </Button>
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
