import { Container } from "@/components/layout/section";

const stats = [
  { value: "26", label: "Sectors covered", description: "Industry-specific benchmarks" },
  { value: "12", label: "Core metrics", description: "KPIs investors look for" },
  { value: "100+", label: "Data points", description: "Comprehensive analysis" },
  { value: "3", label: "Scenarios", description: "Bull, base, and bear cases" },
];

export function StatsStrip() {
  return (
    <div className="py-5 border-y border-border bg-card">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-soft border border-border rounded-[var(--radius-lg)] p-4"
            >
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none mb-2">
                {stat.value}
              </p>
              <p className="eyebrow mb-1">{stat.label}</p>
              <p className="text-xs text-muted">{stat.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
