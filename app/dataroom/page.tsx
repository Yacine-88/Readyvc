"use client";

import { useState, useEffect, useRef } from "react";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useI18n } from "@/lib/i18n";
import { CheckCircle2, Circle, RotateCcw, Save } from "lucide-react";
import { FlowProgress } from "@/components/flow-progress";
import { FlowContinue } from "@/components/flow-continue";
import { getCompletedSteps, markStepComplete, type FlowStepId } from "@/lib/flow";
import { ExpertMeetingModal } from "@/components/ui/expert-meeting-modal";
import { getLocalReadinessScore, saveReadinessSnapshot } from "@/lib/local-readiness";
import { saveToolToDB, getToolFromDB } from "@/lib/db-tools";
import { createClient } from "@/lib/supabase-client";
import { track } from "@/lib/analytics";

interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  status: "missing" | "incomplete" | "complete";
}

const INITIAL_DOCUMENTS: Document[] = [
  { id: "corp_1", name: "Certificate of Incorporation", description: "Official registration document", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_2", name: "Bylaws / Operating Agreement", description: "Company governance document", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_3", name: "Cap Table", description: "Current shareholder structure", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_4", name: "Stock Option Plan", description: "Employee equity details", category: "Corporate Documents", required: false, status: "missing" },

  { id: "fin_1", name: "Income Statement (3 years)", description: "Revenue and expenses", category: "Financials", required: true, status: "missing" },
  { id: "fin_2", name: "Balance Sheet", description: "Assets, liabilities, equity", category: "Financials", required: true, status: "missing" },
  { id: "fin_3", name: "Cash Flow Statement", description: "3 years historical", category: "Financials", required: true, status: "missing" },
  { id: "fin_4", name: "Financial Projections", description: "3-5 year forecast", category: "Financials", required: true, status: "missing" },
  { id: "fin_5", name: "Monthly Burn Report", description: "Current burn rate", category: "Financials", required: false, status: "missing" },

  { id: "pitch_1", name: "Pitch Deck", description: "Investment presentation", category: "Pitch Materials", required: true, status: "missing" },
  { id: "pitch_2", name: "Executive Summary", description: "1-2 page overview", category: "Pitch Materials", required: true, status: "missing" },
  { id: "pitch_3", name: "One-Pager", description: "Quick reference document", category: "Pitch Materials", required: false, status: "missing" },

  { id: "legal_1", name: "Term Sheet (if applicable)", description: "Previous funding terms", category: "Legal", required: false, status: "missing" },
  { id: "legal_2", name: "IP Assignment Agreements", description: "Founder IP assignment", category: "Legal", required: true, status: "missing" },
  { id: "legal_3", name: "Key Contracts", description: "Material agreements", category: "Legal", required: false, status: "missing" },
];

export default function DataRoomPage() {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [saved, setSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<FlowStepId[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const trackedOpen = useRef(false);

  useEffect(() => {
    if (!trackedOpen.current) {
      trackedOpen.current = true;
      track("tool_opened", { tool: "dataroom" });
    }
  }, []);

  useEffect(() => {
    setCompletedSteps(getCompletedSteps());

    // Auth-aware data loading:
    // - Authenticated users: DB is source of truth. If DB has no data, start fresh
    //   (never load stale localStorage from a previous user/session).
    // - Unauthenticated users: fall back to localStorage as before.
    const loadDocuments = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const db = await getToolFromDB("dataroom");
      if (db?.inputs) {
        const inp = db.inputs as { documents?: Document[] };
        if (inp.documents && inp.documents.length > 0) {
          setDocuments(inp.documents);
          return;
        }
      }

      if (!user) {
        // Unauthenticated — localStorage is acceptable fallback
        const savedDocs = localStorage.getItem("dataroom_documents");
        if (savedDocs) {
          try { setDocuments(JSON.parse(savedDocs)); } catch {}
        }
      }
      // Authenticated user with no DB data → start with INITIAL_DOCUMENTS (clean slate)
    };

    loadDocuments();
  }, []);

  const notifyFoundationRefresh = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("vcready:foundation-profile-updated"));
    window.dispatchEvent(new Event("vcready:foundation-snapshot-updated"));
  };

  const categories = Array.from(new Set(documents.map((d) => d.category)));
  const completeCount = documents.filter((d) => d.status === "complete").length;
  const incompleteCount = documents.filter((d) => d.status === "incomplete").length;
  const requiredMissingCount = documents.filter((d) => d.required && d.status !== "complete").length;
  const totalDocs = documents.length;

  const completionRate = Math.round((completeCount / totalDocs) * 100);
  const requiredComplete = documents.filter((d) => d.required && d.status === "complete").length;
  const requiredTotal = documents.filter((d) => d.required).length;
  const readinessScore = requiredTotal > 0 ? Math.round((requiredComplete / requiredTotal) * 100) : 0;

  const isComplete =
    requiredComplete >= Math.ceil(requiredTotal * 0.7) &&
    completeCount >= Math.ceil(totalDocs * 0.5);

  useEffect(() => {
    if (isComplete) {
      markStepComplete("dataroom");
      setCompletedSteps(getCompletedSteps());
    }
  }, [isComplete]);

  const cycleDocumentStatus = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;

        const nextStatus =
          doc.status === "missing"
            ? "incomplete"
            : doc.status === "incomplete"
            ? "complete"
            : "missing";

        return { ...doc, status: nextStatus };
      })
    );
  };

  const saveResults = () => {
    localStorage.setItem("dataroom_documents", JSON.stringify(documents));
    localStorage.setItem(
      "dataroom_results",
      JSON.stringify({
        timestamp: new Date().toISOString(),
        completionRate,
        readinessScore,
        complete: completeCount,
        incomplete: incompleteCount,
        total: totalDocs,
        required_missing: requiredMissingCount,
      })
    );

    saveReadinessSnapshot();

    saveToolToDB("dataroom", readinessScore, {
      documents: documents as unknown as Record<string, unknown>[],
      derived: {
        completionRate,
        completeCount,
        incompleteCount,
        totalDocs,
        requiredMissingCount,
        requiredComplete,
        requiredTotal,
      } as unknown as Record<string, unknown>,
    }).catch(console.error);

    notifyFoundationRefresh();

    track("tool_saved", { tool: "dataroom", score: readinessScore });
    track("dataroom_saved", { score: readinessScore });
    if (readinessScore >= 70) track("tool_completed", { tool: "dataroom", score: readinessScore });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    const readiness = getLocalReadinessScore();
    setOverallScore(readiness.overall_score);
    setTimeout(() => setShowModal(true), 1200);
  };

  const resetAll = () => {
    if (confirm("Reset all documents? This cannot be undone.")) {
      setDocuments(INITIAL_DOCUMENTS);
      localStorage.removeItem("dataroom_documents");
      localStorage.removeItem("dataroom_results");
    }
  };

  const statusIcon = (status: Document["status"]) => {
    if (status === "complete") {
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    }
    if (status === "incomplete") {
      return <Circle className="w-5 h-5 text-warning" />;
    }
    return <Circle className="w-5 h-5 text-muted" />;
  };

  const statusLabel = (status: Document["status"]) => {
    if (status === "complete") return "Complete";
    if (status === "incomplete") return "Incomplete";
    return "Missing";
  };

  return (
    <>
      <ToolPageLayout
        kicker={t("tool.dataroom.kicker") || "Data Room"}
        title={t("tool.dataroom.title") || "Are you ready for due diligence?"}
        description={t("tool.dataroom.desc") || "Track your data room completeness and investor readiness."}
      >
        <FlowProgress currentStep="dataroom" completedSteps={completedSteps} />

        <ToolSection title={t("dataroom.readiness_score") || "Readiness Score"}>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Documents Complete
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-mono font-bold text-foreground">{completeCount}</span>
                <span className="text-sm text-muted">/ {totalDocs}</span>
              </div>
              <ProgressBar value={completionRate} />
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Incomplete
              </p>
              <p className="text-3xl font-mono font-bold text-foreground mb-3">{incompleteCount}</p>
              <p className="text-xs text-muted">
                Partially prepared documents
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Required Missing
              </p>
              <p className="text-3xl font-mono font-bold text-foreground mb-3">{requiredMissingCount}</p>
              <p className="text-xs text-muted">
                {requiredMissingCount === 0 ? "All required docs covered" : `${requiredMissingCount} still missing`}
              </p>
            </div>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                Investor Readiness
              </p>
              <p className="text-3xl font-mono font-bold text-accent mb-3">{readinessScore}%</p>
              <p className="text-xs text-muted">
                {readinessScore >= 80 ? "Excellent position" : readinessScore >= 60 ? "Good, room for improvement" : "Needs work"}
              </p>
            </div>
          </div>
        </ToolSection>

        {categories.map((category) => {
          const catDocs = documents.filter((d) => d.category === category);
          const catComplete = catDocs.filter((d) => d.status === "complete").length;

          return (
            <ToolSection key={category} title={category}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-muted font-medium">
                  {catComplete} of {catDocs.length} complete
                </p>
                <ProgressBar
                  value={Math.round((catComplete / catDocs.length) * 100)}
                  className="w-24"
                />
              </div>

              <div className="space-y-3">
                {catDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => cycleDocumentStatus(doc.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      doc.status === "complete"
                        ? "bg-success/5 border-success/30"
                        : doc.status === "incomplete"
                        ? "bg-warning/5 border-warning/30"
                        : "bg-card border-border hover:border-muted"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">{statusIcon(doc.status)}</div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium transition-all ${
                          doc.status === "complete"
                            ? "line-through text-muted"
                            : "text-foreground"
                        }`}
                      >
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted mt-1">{doc.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge
  variant={
    doc.status === "complete"
      ? "success"
      : doc.status === "incomplete"
      ? "warning"
      : "default"
  }
  className="text-[11px]"
>
  {statusLabel(doc.status)}
</Badge>

                      {doc.required && doc.status !== "complete" && (
                        <Badge variant="danger" className="text-[11px]">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ToolSection>
          );
        })}

        <div className="flex items-center gap-3 pt-6">
          <Button
            onClick={saveResults}
            className="flex items-center gap-2 bg-accent text-white hover:bg-accent/90"
            size="sm"
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Results"}
          </Button>
          <Button
            onClick={resetAll}
            variant="secondary"
            className="flex items-center gap-2 border-border"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        <ToolSection title={t("dataroom.analysis") || "Analysis"}>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {readinessScore >= 80
                ? "You have strong document coverage. Your data room is well-structured for investor diligence."
                : readinessScore >= 60
                ? "Good progress. Complete the remaining required documents and upgrade incomplete items."
                : "Focus first on required legal, corporate and financial documents. These are critical for investor readiness."}
            </p>

            {requiredMissingCount > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  {requiredMissingCount} critical document{requiredMissingCount === 1 ? "" : "s"} still missing
                </p>
                <p className="text-xs text-muted">
                  Investors expect these before meaningful diligence.
                </p>
              </div>
            )}

            {incompleteCount > 0 && (
              <div className="bg-soft border border-border rounded-lg p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  {incompleteCount} document{incompleteCount === 1 ? "" : "s"} marked incomplete
                </p>
                <p className="text-xs text-muted">
                  These exist, but still need strengthening before investor review.
                </p>
              </div>
            )}
          </div>
        </ToolSection>

        <FlowContinue isComplete={isComplete} nextHref="/dashboard-v2" nextLabel="Dashboard V2" isFinal />
      </ToolPageLayout>

      {showModal && (
        <ExpertMeetingModal
          score={overallScore}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}