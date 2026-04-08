import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/section";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArrowRight, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { BookSessionCTA } from "@/components/ui/book-session-cta";

export const metadata: Metadata = {
  title: "Investor Readiness - VCReady",
  description: "Your complete investor readiness assessment. See where you stand and what to improve.",
};

const categories = [
  {
    name: "Metrics & Financials",
    score: 85,
    status: "good" as const,
    items: [
      { label: "MRR documented", done: true },
      { label: "Unit economics calculated", done: true },
      { label: "Runway projections", done: true },
      { label: "Financial model complete", done: false },
    ],
  },
  {
    name: "Valuation",
    score: 70,
    status: "good" as const,
    items: [
      { label: "Valuation calculated", done: true },
      { label: "Comparable analysis", done: true },
      { label: "Scenario modeling", done: false },
      { label: "Investor score reviewed", done: true },
    ],
  },
  {
    name: "Data Room",
    score: 45,
    status: "warning" as const,
    items: [
      { label: "Corporate documents", done: true },
      { label: "Financial statements", done: false },
      { label: "Cap table uploaded", done: false },
      { label: "Pitch deck included", done: true },
    ],
  },
  {
    name: "Pitch",
    score: 60,
    status: "warning" as const,
    items: [
      { label: "Problem/Solution clear", done: true },
      { label: "Market size defined", done: true },
      { label: "Competition analysis", done: false },
      { label: "Team slide complete", done: false },
    ],
  },
  {
    name: "Q&A Preparation",
    score: 78,
    status: "good" as const,
    items: [
      { label: "Business model questions", done: true },
      { label: "Traction questions", done: true },
      { label: "Team questions", done: true },
      { label: "Fundraising questions", done: false },
    ],
  },
];

const insights = [
  {
    type: "strength" as const,
    title: "Strong Unit Economics",
    description: "Your LTV:CAC ratio of 7.5x exceeds the 3x benchmark. This signals efficient growth.",
  },
  {
    type: "strength" as const,
    title: "Solid Traction Story",
    description: "24% MoM growth with low churn indicates product-market fit.",
  },
  {
    type: "weakness" as const,
    title: "Incomplete Data Room",
    description: "Missing cap table and financial projections. Critical for due diligence.",
  },
  {
    type: "weakness" as const,
    title: "Team Positioning Weak",
    description: "Team slide needs work. Highlight domain expertise and relevant experience.",
  },
];

const nextSteps = [
  {
    priority: 1,
    action: "Upload cap table to Data Room",
    impact: "High",
    time: "30 min",
    href: "/dataroom",
  },
  {
    priority: 2,
    action: "Complete financial projections",
    impact: "High",
    time: "2 hours",
    href: "/dataroom",
  },
  {
    priority: 3,
    action: "Strengthen team slide",
    impact: "Medium",
    time: "1 hour",
    href: "/pitch",
  },
  {
    priority: 4,
    action: "Prepare competition analysis",
    impact: "Medium",
    time: "1 hour",
    href: "/pitch",
  },
];

export default function ReadinessPage() {
  const overallScore = Math.round(
    categories.reduce((acc, c) => acc + c.score, 0) / categories.length
  );

  const getVerdict = (score: number) => {
    if (score >= 80) return { label: "Investor Ready", variant: "success" as const };
    if (score >= 60) return { label: "Good Progress", variant: "success" as const };
    if (score >= 40) return { label: "Needs Work", variant: "warning" as const };
    return { label: "Critical", variant: "danger" as const };
  };

  const verdict = getVerdict(overallScore);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          {/* Hero Score */}
          <Card className="mb-5 overflow-hidden" padding="lg">
            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-px bg-border-strong" aria-hidden="true" />
                  Investor Readiness Assessment
                </p>
                <div className="flex items-baseline gap-4 mb-4">
                  <h1 className="text-7xl md:text-8xl font-extrabold tracking-tighter leading-none">
                    {overallScore}
                  </h1>
                  <span className="text-3xl text-muted font-bold">/100</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant={verdict.variant}>{verdict.label}</Badge>
                  <span className="text-sm text-ink-secondary">
                    You&apos;re in the top 30% of startups at your stage
                  </span>
                </div>
                <p className="text-ink-secondary leading-relaxed max-w-lg">
                  Your readiness score reflects your overall preparedness for fundraising.
                  Focus on the priority actions below to improve your position.
                </p>
              </div>

              {/* Gauge Visual */}
              <div className="relative w-[180px] h-[180px] hidden lg:block">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                  <circle
                    cx="90"
                    cy="90"
                    r="75"
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="75"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallScore / 100) * 471} 471`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-accent mb-1" />
                  <span className="text-xs font-semibold text-muted">Score</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card className="mb-5" padding="sm">
            <CardHeader>
              <CardTitle kicker="Breakdown">Score by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                {categories.map((cat) => (
                  <CategoryCard key={cat.name} {...cat} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Insights */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Analysis">Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card padding="sm">
              <CardHeader>
                <CardTitle kicker="Action Plan">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nextSteps.map((step) => (
                    <NextStepCard key={step.priority} {...step} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book Session CTA */}
          <div className="mt-5">
            <BookSessionCTA />
          </div>

          {/* Priority CTA - Prominent and Visible */}
          <div className="mt-8 bg-gradient-to-r from-accent to-accent/80 rounded-[var(--radius-lg)] p-8 md:p-10 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Boost Your Readiness Score
                </h3>
                <p className="text-white/90 leading-relaxed max-w-lg">
                  Start with your Data Room. Upload key documents, cap table, and financial statements to increase investor confidence.
                </p>
              </div>
              <Button
                href="/dataroom"
                className="bg-white text-accent hover:bg-white/95 border-transparent font-semibold gap-2 shrink-0"
                size="lg"
              >
                Start with Data Room
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

function CategoryCard({
  name,
  score,
  status,
  items,
}: {
  name: string;
  score: number;
  status: "good" | "warning" | "danger";
  items: { label: string; done: boolean }[];
}) {
  const completed = items.filter((i) => i.done).length;

  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-ink">{name}</span>
        <span className="text-lg font-extrabold tracking-tight">{score}</span>
      </div>
      <ProgressBar value={score} status={status} size="sm" className="mb-3" />
      <p className="text-[10px] text-muted">
        {completed}/{items.length} items complete
      </p>
    </div>
  );
}

function InsightCard({
  type,
  title,
  description,
}: {
  type: "strength" | "weakness";
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex gap-3 p-4 rounded-[var(--radius-md)] border ${
        type === "strength"
          ? "bg-success-soft border-success-border"
          : "bg-warning-soft border-warning-border"
      }`}
    >
      {type === "strength" ? (
        <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      )}
      <div>
        <h4 className="text-sm font-semibold mb-1">{title}</h4>
        <p className="text-xs text-ink-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function NextStepCard({
  priority,
  action,
  impact,
  time,
  href,
}: {
  priority: number;
  action: string;
  impact: string;
  time: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-card border border-border rounded-[var(--radius-md)] p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm"
    >
      <span className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-sm font-bold shrink-0">
        {priority}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold mb-0.5">{action}</h4>
        <p className="text-[10px] text-muted">
          Impact: {impact} &middot; Est. {time}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted" />
    </Link>
  );
}
