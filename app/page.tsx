import { HeroSection } from "@/components/landing/hero-section";
import { StatsStrip } from "@/components/landing/stats-strip";
import { ToolsSection } from "@/components/landing/tools-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FinalCTA } from "@/components/landing/final-cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsStrip />
      <ToolsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FinalCTA />
    </>
  );
}
