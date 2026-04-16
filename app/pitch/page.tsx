"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useI18n } from "@/lib/i18n";
import { RotateCcw, Save, Check, ChevronDown, ChevronUp } from "lucide-react";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { saveReadinessSnapshot } from "@/lib/local-readiness";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { useToolGuard } from "@/lib/use-tool-guard";
import { track } from "@/lib/analytics";

const PITCH_SECTIONS = {
  problem: {
    label: { en: "Problem", fr: "Probleme" },
    weight: 12,
    questions: [
      {
        id: "problem_clear",
        question: { en: "Is the problem clearly defined?", fr: "Le probleme est-il clairement defini ?" },
        hint: { en: "Investors need to understand the pain point in 30 seconds", fr: "Les investisseurs doivent comprendre la douleur en 30 secondes" },
      },
      {
        id: "problem_big",
        question: { en: "Is it a significant problem worth solving?", fr: "Est-ce un probleme significatif a resoudre ?" },
        hint: { en: "Show the magnitude of the problem with data", fr: "Montrez l'ampleur du probleme avec des donnees" },
      },
      {
        id: "problem_validated",
        question: { en: "Have you validated the problem with customers?", fr: "Avez-vous valide le probleme avec des clients ?" },
        hint: { en: "Customer interviews, surveys, or research", fr: "Interviews clients, sondages ou etude de marche" },
      },
    ],
  },
  solution: {
    label: { en: "Solution", fr: "Solution" },
    weight: 12,
    questions: [
      {
        id: "solution_clear",
        question: { en: "Is your solution easy to understand?", fr: "Votre solution est-elle facile a comprendre ?" },
        hint: { en: "Explain it simply without jargon", fr: "Expliquez-la simplement sans jargon" },
      },
      {
        id: "solution_unique",
        question: { en: "What makes your solution unique?", fr: "Qu'est-ce qui rend votre solution unique ?" },
        hint: { en: "Your unfair advantage or secret sauce", fr: "Votre avantage competitif ou secret" },
      },
      {
        id: "solution_demo",
        question: { en: "Can you demo or show the product?", fr: "Pouvez-vous demontrer le produit ?" },
        hint: { en: "Screenshots, video, or live demo", fr: "Captures, video ou demo live" },
      },
    ],
  },
  market: {
    label: { en: "Market Size", fr: "Taille du Marche" },
    weight: 15,
    questions: [
      {
        id: "market_tam",
        question: { en: "Have you calculated TAM, SAM, SOM?", fr: "Avez-vous calcule TAM, SAM, SOM ?" },
        hint: { en: "Top-down and bottom-up analysis", fr: "Analyse top-down et bottom-up" },
      },
      {
        id: "market_growth",
        question: { en: "Is the market growing?", fr: "Le marche est-il en croissance ?" },
        hint: { en: "Market growth rate and trends", fr: "Taux de croissance et tendances" },
      },
      {
        id: "market_timing",
        question: { en: "Why is now the right time?", fr: "Pourquoi est-ce le bon moment ?" },
        hint: { en: "Tailwinds, regulations, tech shifts", fr: "Vents porteurs, reglementations, changements technologiques" },
      },
    ],
  },
  traction: {
    label: { en: "Traction", fr: "Traction" },
    weight: 18,
    questions: [
      {
        id: "traction_metrics",
        question: { en: "Do you have key metrics to show?", fr: "Avez-vous des metriques cles a montrer ?" },
        hint: { en: "Revenue, users, growth rate", fr: "Chiffre d'affaires, utilisateurs, taux de croissance" },
      },
      {
        id: "traction_growth",
        question: { en: "Is growth consistent and accelerating?", fr: "La croissance est-elle constante et accelere ?" },
        hint: { en: "Month-over-month or week-over-week", fr: "Mois sur mois ou semaine sur semaine" },
      },
      {
        id: "traction_engagement",
        question: { en: "Do customers love your product?", fr: "Les clients adorent-ils votre produit ?" },
        hint: { en: "NPS, retention, testimonials", fr: "NPS, retention, temoignages" },
      },
    ],
  },
  business: {
    label: { en: "Business Model", fr: "Modele Economique" },
    weight: 12,
    questions: [
      {
        id: "business_revenue",
        question: { en: "How do you make money?", fr: "Comment gagnez-vous de l'argent ?" },
        hint: { en: "Clear revenue model", fr: "Modele de revenus clair" },
      },
      {
        id: "business_unit",
        question: { en: "Are your unit economics clear?", fr: "Vos unit economics sont-ils clairs ?" },
        hint: { en: "CAC, LTV, margins", fr: "CAC, LTV, marges" },
      },
      {
        id: "business_scalable",
        question: { en: "Is the model scalable?", fr: "Le modele est-il scalable ?" },
        hint: { en: "Path to profitability", fr: "Chemin vers la rentabilite" },
      },
    ],
  },
  competition: {
    label: { en: "Competition", fr: "Concurrence" },
    weight: 10,
    questions: [
      {
        id: "competition_landscape",
        question: { en: "Do you know your competitors?", fr: "Connaissez-vous vos concurrents ?" },
        hint: { en: "Direct and indirect competitors", fr: "Concurrents directs et indirects" },
      },
      {
        id: "competition_differentiation",
        question: { en: "Why will you win?", fr: "Pourquoi allez-vous gagner ?" },
        hint: { en: "Clear differentiation strategy", fr: "Strategie de differenciation claire" },
      },
      {
        id: "competition_honest",
        question: { en: "Are you honest about competition?", fr: "Etes-vous honnete sur la concurrence ?" },
        hint: { en: "Don't say 'no competitors'", fr: "Ne dites pas 'pas de concurrents'" },
      },
    ],
  },
  team: {
    label: { en: "Team", fr: "Equipe" },
    weight: 15,
    questions: [
      {
        id: "team_founders",
        question: { en: "Do founders have relevant experience?", fr: "Les fondateurs ont-ils une experience pertinente ?" },
        hint: { en: "Domain expertise, track record", fr: "Expertise sectorielle, track record" },
      },
      {
        id: "team_complete",
        question: { en: "Is the team complete for this stage?", fr: "L'equipe est-elle complete pour ce stade ?" },
        hint: { en: "Key roles filled or planned", fr: "Roles cles remplis ou planifies" },
      },
      {
        id: "team_why",
        question: { en: "Why is this team uniquely positioned?", fr: "Pourquoi cette equipe est-elle uniquement positionnee ?" },
        hint: { en: "Founder-market fit", fr: "Founder-market fit" },
      },
    ],
  },
  financials: {
    label: { en: "Financials", fr: "Finances" },
    weight: 8,
    questions: [
      {
        id: "financials_projections",
        question: { en: "Do you have realistic projections?", fr: "Avez-vous des projections realistes ?" },
        hint: { en: "3-5 year financial model", fr: "Modele financier 3-5 ans" },
      },
      {
        id: "financials_assumptions",
        question: { en: "Are assumptions clearly stated?", fr: "Les hypotheses sont-elles clairement enoncees ?" },
        hint: { en: "Key drivers explained", fr: "Drivers cles expliques" },
      },
    ],
  },
  ask: {
    label: { en: "The Ask", fr: "La Demande" },
    weight: 8,
    questions: [
      {
        id: "ask_amount",
        question: { en: "Is the ask amount clear and justified?", fr: "Le montant demande est-il clair et justifie ?" },
        hint: { en: "How much and why", fr: "Combien et pourquoi" },
      },
      {
        id: "ask_use",
        question: { en: "Is use of funds detailed?", fr: "L'utilisation des fonds est-elle detaillee ?" },
        hint: { en: "Hiring, product, marketing allocation", fr: "Recrutement, produit, marketing" },
      },
      {
        id: "ask_milestones",
        question: { en: "What milestones will this funding achieve?", fr: "Quels jalons ce financement atteindra-t-il ?" },
        hint: { en: "Clear goals and timeline", fr: "Objectifs et timeline clairs" },
      },
    ],
  },
};

type SectionKey = keyof typeof PITCH_SECTIONS;
type Answers = Record<string, 0 | 1 | 2 | 3>;

const defaultAnswers: Answers = {};

export default function PitchPage() {
  const { ready } = useToolGuard();
  const { t, locale } = useI18n();
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>("problem");
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);
  const trackedOpen = useRef(false);

  useEffect(() => {
    if (ready && !trackedOpen.current) {
      trackedOpen.current = true;
      track("tool_opened", { tool: "pitch" });
    }
  }, [ready]);

  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    try {
      const raw = localStorage.getItem("vcready_pitch_inputs");
      if (raw) {
        const data = JSON.parse(raw) as { answers?: Answers };
        if (data.answers && Object.keys(data.answers).length > 0) {
          setAnswers(data.answers);
        }
      }
    } catch {
      // ignore
    }

    getToolFromDB("pitch").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as { answers?: Answers };
      if (inp.answers && Object.keys(inp.answers).length > 0) {
        setAnswers(inp.answers);
      }
    });
  }, []);

  const notifyFoundationRefresh = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  };

  const updateAnswer = useCallback((questionId: string, value: 0 | 1 | 2 | 3) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  }, []);

  const handleReset = useCallback(() => {
    setAnswers(defaultAnswers);
    setSaved(false);
  }, []);

  const sectionScores = useMemo(() => {
    const scores: Record<
      SectionKey,
      {
        score: number;
        maxScore: number;
        percentage: number;
        status: "complete" | "warning" | "incomplete";
      }
    > = {} as never;

    (Object.keys(PITCH_SECTIONS) as SectionKey[]).forEach((sectionKey) => {
      const section = PITCH_SECTIONS[sectionKey];
      const questions = section.questions;
      let sectionScore = 0;
      let answeredCount = 0;

      questions.forEach((q) => {
        const answer = answers[q.id] || 0;
        if (answer > 0) {
          answeredCount++;
          sectionScore += answer;
        }
      });

      const maxScore = questions.length * 3;
      const percentage = maxScore > 0 ? (sectionScore / maxScore) * 100 : 0;

      let status: "complete" | "warning" | "incomplete" = "incomplete";
      if (answeredCount === questions.length) {
        status = percentage >= 66 ? "complete" : "warning";
      } else if (answeredCount > 0) {
        status = "warning";
      }

      scores[sectionKey] = { score: sectionScore, maxScore, percentage, status };
    });

    return scores;
  }, [answers]);

  const overallScore = useMemo(() => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    (Object.keys(PITCH_SECTIONS) as SectionKey[]).forEach((sectionKey) => {
      const section = PITCH_SECTIONS[sectionKey];
      const sectionScore = sectionScores[sectionKey];
      totalWeightedScore += (sectionScore.percentage / 100) * section.weight;
      totalWeight += section.weight;
    });

    return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
  }, [sectionScores]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v > 0).length,
    [answers]
  );
  const totalQuestions = useMemo(
    () =>
      (Object.keys(PITCH_SECTIONS) as SectionKey[]).reduce(
        (sum, key) => sum + PITCH_SECTIONS[key].questions.length,
        0
      ),
    []
  );

  const isComplete = answeredCount >= Math.ceil(totalQuestions * 0.7);

  useEffect(() => {
    if (isComplete) {
      markStepComplete("pitch");
      setCompletedSteps(getCompletedSteps());
    }
  }, [isComplete]);

  const improvements = useMemo(() => {
    const list: {
      priority: "high" | "medium" | "low";
      section: string;
      issue: string;
      suggestion: string;
    }[] = [];

    (Object.keys(PITCH_SECTIONS) as SectionKey[]).forEach((sectionKey) => {
      const section = PITCH_SECTIONS[sectionKey];
      const score = sectionScores[sectionKey];
      const sectionLabel = section.label[locale];

      if (score.percentage < 33) {
        list.push({
          priority: "high",
          section: sectionLabel,
          issue:
            locale === "en"
              ? `${sectionLabel} section is incomplete`
              : `Section ${sectionLabel} incomplete`,
          suggestion:
            locale === "en"
              ? "Focus on answering all questions in this critical section."
              : "Concentrez-vous sur toutes les questions de cette section critique.",
        });
      } else if (score.percentage < 66) {
        list.push({
          priority: "medium",
          section: sectionLabel,
          issue:
            locale === "en"
              ? `${sectionLabel} needs strengthening`
              : `${sectionLabel} a renforcer`,
          suggestion:
            locale === "en"
              ? "Review weak areas and add more supporting evidence."
              : "Revoyez les points faibles et ajoutez plus de preuves.",
        });
      }
    });

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return list.slice(0, 5);
  }, [sectionScores, locale]);

  const handleSave = useCallback(() => {
    // Same flat {score} pattern as qa and captable — simplest and most reliable
    localStorage.setItem("vcready_pitch", JSON.stringify({ score: overallScore }));

    localStorage.setItem(
      "vcready_pitch_inputs",
      JSON.stringify({
        answers,
      })
    );

    saveReadinessSnapshot();

    saveToolToDB("pitch", overallScore, {
      answers: answers as unknown as Record<string, unknown>,
      derived: {
        answered_count: answeredCount,
        total_questions: totalQuestions,
        completion_rate: Math.round((answeredCount / totalQuestions) * 100),
        section_scores: Object.fromEntries(
          (Object.keys(PITCH_SECTIONS) as SectionKey[]).map((key) => [
            key,
            Math.round(sectionScores[key].percentage),
          ])
        ) as unknown as Record<string, unknown>,
      } as unknown as Record<string, unknown>,
    }).catch(console.error);

    notifyFoundationRefresh();

    track("tool_saved", { tool: "pitch", score: overallScore });
    track("pitch_saved", { score: overallScore });
    if (overallScore >= 70) track("tool_completed", { tool: "pitch", score: overallScore });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [answers, overallScore, answeredCount, totalQuestions, sectionScores]);

  const getScoreLabel = () => {
    if (overallScore >= 80) return t("pitch.investorReady");
    if (overallScore >= 60) return t("pitch.goodProgress");
    return t("pitch.needsWork");
  };

  if (!ready) return <div className="animate-pulse h-screen bg-background" />;

  return (
    <div className="bg-background">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="eyebrow mb-2">{t("pitch.kicker")}</p>
          <h1 className="heading-display mb-3">{t("pitch.title")}</h1>
          <p className="text-ink-secondary max-w-2xl">{t("pitch.description")}</p>
        </div>

        <FlowProgress currentStep="pitch" completedSteps={completedSteps} />

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-4">
            {(Object.keys(PITCH_SECTIONS) as SectionKey[]).map((sectionKey) => {
              const section = PITCH_SECTIONS[sectionKey];
              const score = sectionScores[sectionKey];
              const isExpanded = expandedSection === sectionKey;

              return (
                <div
                  key={sectionKey}
                  className="bg-card border border-border rounded-[var(--radius-lg)] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-soft/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={score.status} />
                      <span className="font-semibold text-sm">{section.label[locale]}</span>
                      <span className="text-xs text-muted">({section.weight}%)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">
                        {Math.round(score.percentage)}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                      {section.questions.map((q) => (
                        <QuestionItem
                          key={q.id}
                          question={q.question[locale]}
                          hint={q.hint[locale]}
                          value={answers[q.id] || 0}
                          onChange={(v) => updateAnswer(q.id, v)}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 pt-4">
              <Button onClick={handleReset} variant="secondary" className="flex-1">
                <RotateCcw className="w-4 h-4" />
                {t("common.reset")}
              </Button>
              <Button onClick={handleSave} className="flex-1">
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? t("common.saved") : t("common.saveToDashboard")}
              </Button>
            </div>

            <FlowContinue
              isComplete={isComplete}
              nextHref="/dataroom"
              nextLabel="Data Room"
            />
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
              <h3 className="text-sm font-bold tracking-tight mb-4">{t("pitch.pitchScore")}</h3>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="font-mono text-5xl font-bold tracking-tight mb-1">
                    {overallScore}
                    <span className="text-muted text-2xl">/100</span>
                  </p>
                </div>
                <Badge
                  variant={
                    overallScore >= 70
                      ? "success"
                      : overallScore >= 50
                      ? "warning"
                      : "danger"
                  }
                >
                  {getScoreLabel()}
                </Badge>
              </div>
              <ProgressBar
                value={overallScore}
                status={
                  overallScore >= 70
                    ? "good"
                    : overallScore >= 50
                    ? "warning"
                    : "danger"
                }
              />
              <p className="text-xs text-muted mt-3">
                {answeredCount}/{totalQuestions} questions evaluated
              </p>
            </div>

            <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
              <h3 className="text-sm font-bold tracking-tight mb-4">{t("pitch.sections")}</h3>
              <div className="space-y-3">
                {(Object.keys(PITCH_SECTIONS) as SectionKey[]).map((sectionKey) => {
                  const section = PITCH_SECTIONS[sectionKey];
                  const score = sectionScores[sectionKey];

                  return (
                    <div key={sectionKey} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIndicator status={score.status} size="sm" />
                        <span className="text-xs">{section.label[locale]}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold">
                        {Math.round(score.percentage)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {improvements.length > 0 && (
              <div className="bg-card border border-border rounded-[var(--radius-lg)] p-5">
                <h3 className="text-sm font-bold tracking-tight mb-4">{t("pitch.improvements")}</h3>
                <div className="space-y-3">
                  {improvements.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Badge
                        variant={
                          item.priority === "high"
                            ? "danger"
                            : item.priority === "medium"
                            ? "warning"
                            : "success"
                        }
                        className="shrink-0 mt-0.5"
                      >
                        {item.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted mb-0.5">{item.section}</p>
                        <p className="text-xs text-ink-secondary">{item.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({
  status,
  size = "md",
}: {
  status: "complete" | "warning" | "incomplete";
  size?: "sm" | "md";
}) {
  const colors = {
    complete: "bg-success",
    warning: "bg-warning",
    incomplete: "bg-border",
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
  };

  return <span className={`${sizeClasses[size]} rounded-full ${colors[status]}`} />;
}

function QuestionItem({
  question,
  hint,
  value,
  onChange,
  locale,
}: {
  question: string;
  hint: string;
  value: 0 | 1 | 2 | 3;
  onChange: (v: 0 | 1 | 2 | 3) => void;
  locale: "en" | "fr";
}) {
  const options = [
    {
      value: 1 as const,
      label: locale === "en" ? "Weak" : "Faible",
      color: "bg-danger/10 text-danger border-danger/20",
    },
    {
      value: 2 as const,
      label: "OK",
      color: "bg-warning/10 text-warning border-warning/20",
    },
    {
      value: 3 as const,
      label: locale === "en" ? "Strong" : "Fort",
      color: "bg-success/10 text-success border-success/20",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{question}</p>
      <p className="text-xs text-muted">{hint}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(value === opt.value ? 0 : opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              value === opt.value
                ? opt.color
                : "bg-soft border-border text-muted hover:border-ink/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}