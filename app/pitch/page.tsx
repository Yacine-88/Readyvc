import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Check, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Pitch Analyzer - VCReady",
  description: "Structure and validate your pitch against what investors actually look for.",
};

const pitchSections = [
  { id: "problem", label: "Problem", status: "complete", score: 90 },
  { id: "solution", label: "Solution", status: "complete", score: 85 },
  { id: "market", label: "Market Size", status: "warning", score: 60 },
  { id: "traction", label: "Traction", status: "complete", score: 95 },
  { id: "business", label: "Business Model", status: "complete", score: 80 },
  { id: "competition", label: "Competition", status: "warning", score: 55 },
  { id: "team", label: "Team", status: "incomplete", score: 40 },
  { id: "financials", label: "Financials", status: "complete", score: 75 },
  { id: "ask", label: "The Ask", status: "complete", score: 88 },
];

export default function PitchPage() {
  const overallScore = Math.round(
    pitchSections.reduce((acc, s) => acc + s.score, 0) / pitchSections.length
  );

  return (
    <ToolPageLayout
      kicker="Pitch Analyzer"
      title="Build a pitch that resonates."
      description="Structure and validate your pitch against what investors actually look for. Section-by-section feedback."
    >
      {/* Overall Score */}
      <ToolSection title="Pitch Score">
        <div className="flex items-center justify-between gap-6 mb-6">
          <div>
            <p className="text-5xl font-extrabold tracking-tight mb-2">
              {overallScore}<span className="text-muted text-2xl">/100</span>
            </p>
            <p className="text-sm text-ink-secondary">
              Your pitch is strong but needs work on Team and Competition sections.
            </p>
          </div>
          <div className="hidden md:block">
            <Badge variant={overallScore >= 70 ? "success" : "warning"}>
              {overallScore >= 80 ? "Investor Ready" : overallScore >= 60 ? "Good Progress" : "Needs Work"}
            </Badge>
          </div>
        </div>
        <ProgressBar value={overallScore} status={overallScore >= 70 ? "good" : "warning"} />
      </ToolSection>

      {/* Sections Grid */}
      <ToolSection title="Pitch Sections">
        <div className="grid md:grid-cols-3 gap-4">
          {pitchSections.map((section) => (
            <PitchSectionCard key={section.id} {...section} />
          ))}
        </div>
      </ToolSection>

      {/* Detailed Analysis */}
      <ToolSection title="Priority Improvements">
        <div className="space-y-4">
          <ImprovementItem
            priority="high"
            section="Team"
            issue="Team slide is incomplete"
            suggestion="Add background and relevant experience for each co-founder. Highlight domain expertise."
          />
          <ImprovementItem
            priority="medium"
            section="Competition"
            issue="Competitive landscape is weak"
            suggestion="Create a proper 2x2 matrix. Include indirect competitors. Be honest about positioning."
          />
          <ImprovementItem
            priority="low"
            section="Market Size"
            issue="TAM calculation unclear"
            suggestion="Show bottom-up calculation. Explain SAM and SOM derivation clearly."
          />
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted">Track your pitch improvements over time</p>
          <Button>Save analysis</Button>
        </div>
      </ToolSection>
    </ToolPageLayout>
  );
}

function PitchSectionCard({
  label,
  status,
  score,
}: {
  id: string;
  label: string;
  status: "complete" | "warning" | "incomplete";
  score: number;
}) {
  const statusConfig = {
    complete: { icon: Check, color: "text-success", bg: "bg-success-soft" },
    warning: { icon: AlertCircle, color: "text-warning", bg: "bg-warning-soft" },
    incomplete: { icon: AlertCircle, color: "text-danger", bg: "bg-danger-soft" },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="bg-soft border border-border rounded-[var(--radius-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center ${config.bg}`}
        >
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">Score</span>
        <span className="text-sm font-bold">{score}%</span>
      </div>
      <ProgressBar
        value={score}
        status={status === "complete" ? "good" : status === "warning" ? "warning" : "danger"}
        size="sm"
      />
    </div>
  );
}

function ImprovementItem({
  priority,
  section,
  issue,
  suggestion,
}: {
  priority: "high" | "medium" | "low";
  section: string;
  issue: string;
  suggestion: string;
}) {
  const priorityVariant = {
    high: "danger" as const,
    medium: "warning" as const,
    low: "success" as const,
  };

  return (
    <div className="flex items-start gap-4 bg-card border border-border rounded-[var(--radius-md)] p-4">
      <Badge variant={priorityVariant[priority]} className="shrink-0 mt-0.5">
        {priority}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted mb-1">{section}</p>
        <h4 className="text-sm font-bold tracking-tight mb-1">{issue}</h4>
        <p className="text-xs text-ink-secondary leading-relaxed">{suggestion}</p>
      </div>
    </div>
  );
}
