import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/section";

interface ToolPageLayoutProps {
  children: React.ReactNode;
  kicker: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function ToolPageLayout({
  children,
  kicker,
  title,
  description,
  actions,
}: ToolPageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {/* Page Header */}
        <div className="border-b border-border py-12">
          <Container narrow>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="eyebrow inline-flex items-center gap-2.5 mb-3">
                  <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
                  {kicker}
                </p>
                <h1 className="heading-section text-3xl md:text-4xl text-balance mb-2">
                  {title}
                </h1>
                <p className="text-ink-secondary text-base leading-relaxed max-w-lg text-pretty">
                  {description}
                </p>
              </div>
              {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
            </div>
          </Container>
        </div>

        {/* Page Content */}
        <div className="py-10">
          <Container narrow>{children}</Container>
        </div>
      </main>
      <Footer />
    </div>
  );
}

interface ToolSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function ToolSection({ children, title, className = "" }: ToolSectionProps) {
  return (
    <div
      className={`bg-card border border-border rounded-[var(--radius-lg)] p-6 mb-5 ${className}`}
    >
      {title && (
        <h2 className="eyebrow pb-4 mb-5 border-b border-border">{title}</h2>
      )}
      {children}
    </div>
  );
}
