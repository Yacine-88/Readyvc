import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="bg-ink text-white">
      <div className="max-w-[var(--container-max)] mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          {/* Content */}
          <div className="max-w-2xl">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
              Ready to raise?
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-tight mb-4 text-balance">
              Know your position before the first meeting.
            </h2>
            <p className="text-white/65 text-base leading-relaxed max-w-lg text-pretty">
              VCReady gives you the tools and insights to walk into investor meetings
              with confidence. Stop guessing, start knowing.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              href="/dashboard"
              className="bg-white text-ink hover:bg-white/90 border-transparent"
              size="lg"
            >
              Get started
              <span aria-hidden="true">&rarr;</span>
            </Button>
            <Button
              href="/valuation"
              variant="secondary"
              className="bg-transparent text-white border-white/20 hover:border-white hover:bg-transparent"
              size="lg"
            >
              Try a tool first
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
