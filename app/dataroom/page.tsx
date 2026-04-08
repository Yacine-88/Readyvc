import { Metadata } from "next";
import { ToolPageLayout, ToolSection } from "@/components/tools/tool-page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FileText, Check, Circle } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Room Builder - VCReady",
  description: "Know exactly what documents you need. Track completeness and get organized.",
};

const documentCategories = [
  {
    title: "Corporate Documents",
    documents: [
      { name: "Certificate of Incorporation", required: true, uploaded: true },
      { name: "Bylaws / Operating Agreement", required: true, uploaded: true },
      { name: "Cap Table", required: true, uploaded: false },
      { name: "Stock Option Plan", required: false, uploaded: false },
    ],
  },
  {
    title: "Financials",
    documents: [
      { name: "Income Statement (3 years)", required: true, uploaded: true },
      { name: "Balance Sheet", required: true, uploaded: true },
      { name: "Cash Flow Statement", required: true, uploaded: false },
      { name: "Financial Projections (3-5 years)", required: true, uploaded: false },
      { name: "Monthly Burn Report", required: false, uploaded: true },
    ],
  },
  {
    title: "Pitch Materials",
    documents: [
      { name: "Pitch Deck", required: true, uploaded: true },
      { name: "Executive Summary", required: true, uploaded: true },
      { name: "One-Pager", required: false, uploaded: false },
    ],
  },
  {
    title: "Legal",
    documents: [
      { name: "Term Sheet (if applicable)", required: false, uploaded: false },
      { name: "IP Assignment Agreements", required: true, uploaded: false },
      { name: "Key Contracts", required: false, uploaded: false },
    ],
  },
];

export default function DataRoomPage() {
  const totalDocs = documentCategories.flatMap((c) => c.documents).length;
  const uploadedDocs = documentCategories
    .flatMap((c) => c.documents)
    .filter((d) => d.uploaded).length;
  const completionRate = Math.round((uploadedDocs / totalDocs) * 100);

  return (
    <ToolPageLayout
      kicker="Data Room Builder"
      title="Get organized before due diligence."
      description="Know exactly what documents you need. Track completeness and get organized before investors ask."
    >
      {/* Progress Overview */}
      <ToolSection title="Completion Status">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div>
            <p className="text-4xl font-extrabold tracking-tight mb-1">
              {uploadedDocs}<span className="text-muted text-xl">/{totalDocs}</span>
            </p>
            <p className="text-sm text-ink-secondary">documents uploaded</p>
          </div>
          <Badge variant={completionRate >= 70 ? "success" : completionRate >= 40 ? "warning" : "danger"}>
            {completionRate}% complete
          </Badge>
        </div>
        <ProgressBar
          value={completionRate}
          status={completionRate >= 70 ? "good" : completionRate >= 40 ? "warning" : "danger"}
        />
      </ToolSection>

      {/* Document Categories */}
      {documentCategories.map((category) => {
        const catUploaded = category.documents.filter((d) => d.uploaded).length;
        const catTotal = category.documents.length;

        return (
          <ToolSection key={category.title} title={category.title}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted">
                {catUploaded} of {catTotal} uploaded
              </p>
              <ProgressBar
                value={catUploaded}
                max={catTotal}
                status={catUploaded === catTotal ? "good" : "neutral"}
                className="w-24"
                size="sm"
              />
            </div>
            <div className="space-y-2">
              {category.documents.map((doc) => (
                <DocumentRow key={doc.name} {...doc} />
              ))}
            </div>
          </ToolSection>
        );
      })}

      {/* Actions */}
      <div className="flex items-center justify-between bg-card border border-border rounded-[var(--radius-lg)] p-6">
        <p className="text-sm text-muted">
          Upload documents to complete your data room
        </p>
        <Button>Upload documents</Button>
      </div>
    </ToolPageLayout>
  );
}

function DocumentRow({
  name,
  required,
  uploaded,
}: {
  name: string;
  required: boolean;
  uploaded: boolean;
}) {
  return (
    <div className="flex items-center gap-3 bg-soft border border-border rounded-[var(--radius-sm)] px-4 py-3">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          uploaded ? "bg-success text-white" : "bg-border"
        }`}
      >
        {uploaded ? (
          <Check className="w-3 h-3" />
        ) : (
          <Circle className="w-3 h-3 text-muted" />
        )}
      </span>
      <FileText className="w-4 h-4 text-muted" />
      <span className={`text-sm flex-1 ${uploaded ? "text-ink" : "text-muted"}`}>
        {name}
      </span>
      {required && !uploaded && (
        <Badge variant="danger" className="text-[9px]">
          Required
        </Badge>
      )}
      {uploaded && (
        <span className="text-[10px] text-success font-semibold">Uploaded</span>
      )}
    </div>
  );
}
