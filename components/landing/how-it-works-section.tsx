import Link from "next/link";
import { Section, Container, SectionHeader } from "@/components/layout/section";

const steps = [
  {
    number: "01",
    title: "Enter your Metrics",
    description:
      "Input MRR, growth rate, CAC, LTV, and churn. See how your numbers compare to investor benchmarks.",
    href: "/metrics",
  },
  {
    number: "02",
    title: "Run your Valuation",
    description:
      "Calculate your pre-money valuation using three methods. Get a justified number before investors ask.",
    href: "/valuation",
  },
  {
    number: "03",
    title: "Prep your Q&A",
    description:
      "Score yourself on 20 common investor questions. Know exactly where your story is weak.",
    href: "/qa",
  },
  {
    number: "04",
    title: "Get your Verdict",
    description:
      "Your dashboard shows a clear score — Not ready, Partially ready, or Ready to raise — with priority actions.",
    href: "/dashboard",
  },
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" padding="lg">
      <Container>
        <SectionHeader
          kicker="How It Works"
          title="Four steps to know if you're ready."
          className="mb-10"
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="bg-soft border border-border rounded-[var(--radius-lg)] p-6 hover:border-ink/30 transition-colors block"
            >
              <div className="w-10 h-10 rounded-full border border-border-strong bg-card flex items-center justify-center text-sm font-bold mb-5">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.description}</p>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
