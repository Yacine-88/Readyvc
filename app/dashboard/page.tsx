import { Metadata } from "next";
import { Container } from "@/components/layout/section";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { VerdictBanner } from "@/components/dashboard/verdict-banner";
import { ReadinessScore } from "@/components/dashboard/readiness-score";
import { PriorityActions } from "@/components/dashboard/priority-actions";
import { QuickLinks } from "@/components/dashboard/quick-links";
import { ReadinessHistory } from "@/components/dashboard/readiness-history";
import { BookSessionCTA } from "@/components/ui/book-session-cta";

export const metadata: Metadata = {
  title: "Dashboard - VCReady",
  description: "Your investor readiness dashboard. Track your progress and see what needs attention.",
};

export default function DashboardPage() {
  return (
    <div className="py-8">
      <Container>
        <div className="space-y-5">
          <DashboardHero />
          <VerdictBanner />
          <div className="grid lg:grid-cols-2 gap-5">
            <ReadinessScore />
            <PriorityActions />
          </div>
          <ReadinessHistory />
          <QuickLinks />
          <BookSessionCTA />
        </div>
      </Container>
    </div>
  );
}
