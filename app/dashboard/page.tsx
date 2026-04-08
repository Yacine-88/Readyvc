import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/section";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ExecutiveSummary } from "@/components/dashboard/executive-summary";
import { ReadinessScore } from "@/components/dashboard/readiness-score";
import { PriorityActions } from "@/components/dashboard/priority-actions";
import { QuickLinks } from "@/components/dashboard/quick-links";

export const metadata: Metadata = {
  title: "Dashboard - VCReady",
  description: "Your investor readiness dashboard. Track your progress and see what needs attention.",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          <div className="space-y-5">
            <DashboardHero />
            <ExecutiveSummary />
            <div className="grid lg:grid-cols-2 gap-5">
              <ReadinessScore />
              <PriorityActions />
            </div>
            <QuickLinks />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
