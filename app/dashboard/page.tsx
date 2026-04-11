import { Metadata } from "next";
import { Container } from "@/components/layout/section";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { VerdictBanner } from "@/components/dashboard/verdict-banner";
import { ReadinessScore } from "@/components/dashboard/readiness-score";
import { ToolStatusPanel } from "@/components/dashboard/tool-status-panel";
import { SmartAnalysis } from "@/components/dashboard/smart-analysis";
import { ReadinessHistory } from "@/components/dashboard/readiness-history";
import { BookSessionCTA, BookSessionHero } from "@/components/ui/book-session-cta";
import { PDFDownloadButton } from "@/components/dashboard/pdf-download-button";

export const metadata: Metadata = {
  title: "Dashboard — VCReady",
  description: "Your private investor readiness dashboard. Track your score, see what needs attention, and take action.",
};

export default function DashboardPage() {
  return (
    <div className="py-8">
      <Container>
        <div className="space-y-5">
          {/* 1. Personalized hero: name, startup, score summary, next step CTA, assessment actions */}
          <DashboardHero />

          {/* 2. Overall verdict: ❌/⚠️/✅ + strengths/weaknesses + expert CTA */}
          <VerdictBanner />

          {/* 3. Side-by-side: detailed score gauge + tool completion status */}
          <div className="grid lg:grid-cols-2 gap-5">
            <ReadinessScore />
            <ToolStatusPanel />
          </div>

          {/* 4. Smart analysis: strongest area, weakest, priority action, pre-fundraising checklist */}
          <SmartAnalysis />

          {/* 5. PDF Report download */}
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5">
            <div>
              <p className="text-sm font-semibold text-ink mb-0.5">Investor-Ready PDF Report</p>
              <p className="text-xs text-muted">Download a structured report based on your current scores — ready to share with advisors or as a self-assessment reference.</p>
            </div>
            <PDFDownloadButton />
          </div>

          {/* 6. Inline booking CTA */}
          <BookSessionCTA />

          {/* 6. Score history */}
          <ReadinessHistory />

          {/* 7. Final dark booking hero */}
          <BookSessionHero />
        </div>
      </Container>
    </div>
  );
}
