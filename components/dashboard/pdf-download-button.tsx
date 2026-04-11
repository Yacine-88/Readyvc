"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getLocalReadinessScore } from "@/lib/local-readiness";
import { getFounderProfile } from "@/lib/onboard";

export function PDFDownloadButton() {
  const [loading, setLoading] = useState(false);

  const data     = getLocalReadinessScore();
  const profile  = typeof window !== "undefined" ? getFounderProfile() : null;
  const hasData  = data.overall_score > 0;

  async function handleDownload() {
    if (!hasData || !profile || loading) return;
    setLoading(true);
    try {
      const { generatePDFReport } = await import("@/lib/generate-pdf-report");
      await generatePDFReport(data, profile);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={!hasData || loading}
      className={`inline-flex items-center gap-2.5 h-10 px-5 rounded-[var(--radius-md)] text-sm font-semibold transition-all
        ${hasData && !loading
          ? "bg-ink text-white hover:bg-ink/85 shadow-sm hover:shadow-md active:scale-[0.98]"
          : "bg-soft text-muted border border-border cursor-not-allowed"
        }`}
      title={!hasData ? "Complete at least one tool to generate your report" : "Download your investor-ready PDF report"}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          Generating PDF…
        </>
      ) : (
        <>
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
          Download Investor-Ready Report
        </>
      )}
    </button>
  );
}
