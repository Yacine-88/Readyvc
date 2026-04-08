import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Q&A Preparation - VCReady",
  description: "The 50+ questions investors will ask. Prepare your answers and identify gaps.",
};

const questionCategories = [
  {
    title: "Business Model",
    count: 12,
    answered: 10,
    questions: [
      { q: "How do you make money?", answered: true },
      { q: "What is your pricing model?", answered: true },
      { q: "What are your unit economics?", answered: true },
      { q: "What is your path to profitability?", answered: false },
    ],
  },
  {
    title: "Market & Competition",
    count: 10,
    answered: 6,
    questions: [
      { q: "How big is your market (TAM/SAM/SOM)?", answered: true },
      { q: "Who are your main competitors?", answered: true },
      { q: "What is your competitive advantage?", answered: false },
      { q: "Why now?", answered: false },
    ],
  },
  {
    title: "Traction & Metrics",
    count: 15,
    answered: 14,
    questions: [
      { q: "What is your current MRR/ARR?", answered: true },
      { q: "What is your growth rate?", answered: true },
      { q: "What is your churn rate?", answered: true },
      { q: "What is your CAC and LTV?", answered: true },
    ],
  },
  {
    title: "Team & Operations",
    count: 8,
    answered: 5,
    questions: [
      { q: "Why is your team the right one?", answered: true },
      { q: "What are your key hires?", answered: false },
      { q: "How did the founders meet?", answered: true },
      { q: "What is your culture?", answered: false },
    ],
  },
  {
    title: "Fundraising",
    count: 10,
    answered: 8,
    questions: [
      { q: "How much are you raising?", answered: true },
      { q: "What will you use the funds for?", answered: true },
      { q: "What is your valuation expectation?", answered: true },
      { q: "Who else is investing?", answered: false },
    ],
  },
];

export default function QAPage() {
  const totalQuestions = questionCategories.reduce((acc, c) => acc + c.count, 0);
  const answeredQuestions = questionCategories.reduce((acc, c) => acc + c.answered, 0);
  const completionRate = Math.round((answeredQuestions / totalQuestions) * 100);

  return (
    <ToolPageLayout
      kicker="Q&A Preparation"
      title="Be ready for every question."
      description="The 50+ questions investors will ask. Prepare your answers and identify gaps in your story."
    >
      {/* Progress Overview */}
      <ToolSection title="Preparation Progress">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight mb-1">
              {answeredQuestions}<span className="text-muted text-xl">/{totalQuestions}</span>
            </p>
            <p className="text-sm text-ink-secondary">questions prepared</p>
          </div>
          <Badge variant={completionRate >= 80 ? "success" : completionRate >= 50 ? "warning" : "danger"}>
            {completionRate}% ready
          </Badge>
        </div>
        <ProgressBar
          value={completionRate}
          status={completionRate >= 80 ? "good" : completionRate >= 50 ? "warning" : "danger"}
        />
      </ToolSection>

      {/* Question Categories */}
      {questionCategories.map((category) => (
        <ToolSection key={category.title} title={category.title}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted">
              {category.answered} of {category.count} answered
            </p>
            <ProgressBar
              value={category.answered}
              max={category.count}
              status={category.answered === category.count ? "good" : "neutral"}
              className="w-24"
              size="sm"
            />
          </div>
          <div className="space-y-2">
            {category.questions.map((question) => (
              <QuestionRow key={question.q} {...question} />
            ))}
          </div>
          {category.count > category.questions.length && (
            <button className="mt-3 text-xs font-semibold text-accent hover:text-ink transition-colors flex items-center gap-1">
              View all {category.count} questions
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </ToolSection>
      ))}

      {/* Tips */}
      <ToolSection title="Tips for Success">
        <div className="grid md:grid-cols-3 gap-4">
          <TipCard
            number="01"
            title="Be concise"
            description="Keep answers under 2 minutes. Investors appreciate clarity."
          />
          <TipCard
            number="02"
            title="Know your numbers"
            description="Have key metrics memorized. Hesitation signals lack of control."
          />
          <TipCard
            number="03"
            title="Practice out loud"
            description="Record yourself. Speaking differs from writing."
          />
        </div>
      </ToolSection>

      {/* Actions */}
      <div className="flex items-center justify-between bg-card border border-border rounded-[var(--radius-lg)] p-6">
        <p className="text-sm text-muted">
          Continue preparing your answers
        </p>
        <Button>Start practice session</Button>
      </div>
    </ToolPageLayout>
  );
}

function QuestionRow({ q, answered }: { q: string; answered: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 ${
        answered
          ? "bg-success-soft border border-success-border"
          : "bg-soft border border-border"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          answered ? "bg-success" : "bg-muted-foreground"
        }`}
      />
      <span className={`text-sm flex-1 ${answered ? "text-ink" : "text-muted"}`}>
        {q}
      </span>
      {answered ? (
        <span className="text-[10px] text-success font-semibold">Prepared</span>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 text-[10px]">
          Answer
        </Button>
      )}
    </div>
  );
}

function TipCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <span className="eyebrow text-[10px] text-muted">{number}</span>
      <h4 className="text-sm font-semibold mt-1 mb-1">{title}</h4>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </div>
  );
}
