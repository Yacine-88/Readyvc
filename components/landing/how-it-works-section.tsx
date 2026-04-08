import { Section, Container, SectionHeader } from "@/components/layout/section";

const steps = [
  {
    number: "01",
    title: "Enter your data",
    description:
      "Input your current metrics, financials, and business details. Our tools adapt to your sector and stage.",
  },
  {
    number: "02",
    title: "Get instant analysis",
    description:
      "Receive benchmarked insights, scores, and recommendations based on what investors actually look for.",
  },
  {
    number: "03",
    title: "Improve and track",
    description:
      "Use actionable feedback to strengthen your position. Monitor progress as you prepare for fundraising.",
  },
];

export function HowItWorksSection() {
  return (
    <Section padding="lg">
      <Container>
        <SectionHeader
          kicker="How It Works"
          title="From data to investor-ready in three steps."
          className="mb-10"
        />

        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-soft border border-border rounded-[var(--radius-lg)] p-6"
            >
              <div className="w-10 h-10 rounded-full border border-border-strong bg-card flex items-center justify-center text-sm font-bold mb-5">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
