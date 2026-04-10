"use client";

import { useState, useEffect } from "react";
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

interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  status: "missing" | "incomplete" | "complete"; // instead of boolean uploaded
}

const INITIAL_DOCUMENTS: Document[] = [
  // Corporate Documents
  { id: "corp_1", name: "Certificate of Incorporation", description: "Official registration document", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_2", name: "Bylaws / Operating Agreement", description: "Company governance document", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_3", name: "Cap Table", description: "Current shareholder structure", category: "Corporate Documents", required: true, status: "missing" },
  { id: "corp_4", name: "Stock Option Plan", description: "Employee equity details", category: "Corporate Documents", required: false, status: "missing" },
  
  // Financials
  { id: "fin_1", name: "Income Statement (3 years)", description: "Revenue and expenses", category: "Financials", required: true, status: "missing" },
  { id: "fin_2", name: "Balance Sheet", description: "Assets, liabilities, equity", category: "Financials", required: true, status: "missing" },
  { id: "fin_3", name: "Cash Flow Statement", description: "3 years historical", category: "Financials", required: true, status: "missing" },
  { id: "fin_4", name: "Financial Projections", description: "3-5 year forecast", category: "Financials", required: true, status: "missing" },
  { id: "fin_5", name: "Monthly Burn Report", description: "Current burn rate", category: "Financials", required: false, status: "missing" },
  
  // Pitch Materials
  { id: "pitch_1", name: "Pitch Deck", description: "Investment presentation", category: "Pitch Materials", required: true, status: "missing" },
  { id: "pitch_2", name: "Executive Summary", description: "1-2 page overview", category: "Pitch Materials", required: true, status: "missing" },
  { id: "pitch_3", name: "One-Pager", description: "Quick reference document", category: "Pitch Materials", required: false, status: "missing" },
  
  // Legal
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

  // Load saved data on mount
  useEffect(() => {
    setCompletedSteps(getCompletedSteps());
    const saved = localStorage.getItem("dataroom_documents");
    if (saved) {
      setDocuments(JSON.parse(saved));
    }
    // DB restore
    getToolFromDB("dataroom").then((db) => {
      if (!db?.inputs) return;
      const inp = db.inputs as { documents?: Document[] };
      if (inp.documents && inp.documents.length > 0) setDocuments(inp.documents);
    });
  }, []);

  // Calculate stats
  const categories = Array.from(new Set(documents.map((d) => d.category)));
  const completeCount = documents.filter((d) => d.status === "complete").length;
  const incompleteCount = documents.filter((d) => d.status === "incomplete").length;
  const requiredCount = documents.filter((d) => d.required && d.status !== "complete").length;
  const totalDocs = documents.length;
  const completionRate = Math.round((completeCount / totalDocs) * 100);

  useEffect(() => {
    if (completeCount >= 1) {
      markStepComplete("dataroom");
      setCompletedSteps(getCompletedSteps());
    }
  }, [completeCount]);

  // Calculate readiness score (0-100)
  const requiredComplete = documents.filter((d) => d.required && d.status === "complete").length;
  const requiredTotal = documents.filter((d) => d.required).length;
  const readinessScore = requiredTotal > 0 ? Math.round((requiredComplete / requiredTotal) * 100) : 0;

  const toggleDocument = (id: string) => {
    setDocuments(
      documents.map((doc) => {
        if (doc.id === id) {
          const newStatus = doc.status === "complete" ? "missing" : "complete";
          return { ...doc, status: newStatus };
        }
        return doc;
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
      })
    );
    saveReadinessSnapshot();
    saveToolToDB("dataroom", readinessScore, { documents: documents as unknown as Record<string, unknown>[] } as unknown as Record<string, unknown>).catch(console.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Show expert meeting modal after the final step is saved
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

  return (
    <>
    <ToolPageLayout
      kicker={t("tool.dataroom.kicker") || "Data Room"}
      title={t("tool.dataroom.title") || "Are you ready for due diligence?"}
      description={t("tool.dataroom.desc") || "Track your data room completeness and investor readiness."}
    >
      <FlowProgress currentStep="dataroom" completedSteps={completedSteps} />
      {/* Score Panel */}
      <ToolSection title={t("dataroom.readiness_score") || "Readiness Score"}>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              {t("dataroom.documents_complete") || "Documents Complete"}
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-mono font-bold text-foreground">{completeCount}</span>
              <span className="text-sm text-muted">/ {totalDocs}</span>
            </div>
            <ProgressBar value={completionRate} />
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              {t("dataroom.required_missing") || "Required Missing"}
            </p>
            <p className="text-3xl font-mono font-bold text-foreground mb-3">{requiredCount}</p>
            <p className="text-xs text-muted">
              {requiredCount === 0 ? "All required documents marked ✓" : `${requiredCount} documents needed`}
            </p>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
            <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
              {t("dataroom.readiness") || "Investor Readiness"}
            </p>
            <p className="text-3xl font-mono font-bold text-accent mb-3">{readinessScore}%</p>
            <p className="text-xs text-muted">
              {readinessScore >= 80 ? "Excellent position" : readinessScore >= 60 ? "Good, room for improvement" : "Needs work"}
            </p>
          </div>
        </div>
      </ToolSection>

      {/* Document Checklist */}
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
                  onClick={() => toggleDocument(doc.id)}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    doc.status === "complete"
                      ? "bg-success/5 border-success/30"
                      : "bg-card border-border hover:border-muted"
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    {doc.status === "complete" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted" />
                    )}
                  </div>

                  {/* Content */}
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

                  {/* Badge */}
                  {doc.required && doc.status !== "complete" && (
                    <Badge variant="danger" className="text-[11px] flex-shrink-0">
                      {t("dataroom.required") || "Required"}
                    </Badge>
                  )}
                  {doc.status === "complete" && (
                    <span className="text-[11px] font-semibold text-success flex-shrink-0">
                      {t("dataroom.marked") || "Marked"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ToolSection>
        );
      })}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-6">
        <Button
          onClick={saveResults}
          className="flex items-center gap-2 bg-accent text-white hover:bg-accent/90"
          size="sm"
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : (t("common.save") || "Save Results")}
        </Button>
        <Button
          onClick={resetAll}
          variant="secondary"
          className="flex items-center gap-2 border-border"
          size="sm"
        >
          <RotateCcw className="w-4 h-4" />
          {t("common.reset") || "Reset"}
        </Button>
      </div>

      {/* Interpretation */}
      <ToolSection title={t("dataroom.analysis") || "Analysis"}>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {readinessScore >= 80
              ? "You have strong document coverage. Your data room is well-organized for investor meetings."
              : readinessScore >= 60
              ? "Good progress. Complete the remaining required documents to strengthen your position."
              : "Focus on collecting critical legal and financial documents first. This will significantly improve your investor readiness."}
          </p>
          {requiredCount > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-1">
                {requiredCount} critical document{requiredCount === 1 ? "" : "s"} missing
              </p>
              <p className="text-xs text-muted">
                Investors expect these documents. Prioritize completing them.
              </p>
            </div>
          )}
        </div>
      </ToolSection>
      <FlowContinue isComplete={completeCount >= 1} nextHref="/dashboard" nextLabel="Dashboard" isFinal />
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
