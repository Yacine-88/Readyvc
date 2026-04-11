"use client";

import { Calendar } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

/** Inline CTA card — used on dashboard between sections */
export function BookSessionCTA() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-accent/20 bg-accent/5 p-6 md:p-8">
      <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-accent" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Free session</p>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-ink mb-2">
            Turn your assessment into an investor-ready action plan.
          </h3>
          <p className="text-sm text-ink-secondary leading-relaxed max-w-lg">
            Book a free 30-minute founder readiness review. We'll walk through your score, close the
            gaps, and sharpen your fundraising strategy — before you approach investors.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:items-end">
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[var(--radius-md)] bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors whitespace-nowrap shadow-sm"
          >
            Book a founder readiness review →
          </a>
          <p className="text-xs text-muted text-center sm:text-right">
            Free · 30 minutes · No commitment
          </p>
        </div>
      </div>
    </div>
  );
}

/** Bottom hero CTA — full-width dark section for bottom of dashboard */
export function BookSessionHero() {
  return (
    <section className="rounded-[var(--radius-lg)] bg-ink text-white overflow-hidden">
      <div className="px-6 md:px-10 py-10 md:py-12">
        <div className="grid sm:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="max-w-xl">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">
              Expert guidance
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight leading-tight mb-3">
              Need help interpreting your results?
            </h2>
            <p className="text-white/65 text-sm leading-relaxed">
              A VCReady advisor will review your score, help you close the gaps, and build a
              fundraising roadmap tailored to your stage and sector.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[var(--radius-md)] bg-white text-ink text-sm font-bold hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Book your free review →
            </a>
            <p className="text-white/40 text-xs text-center">Free · 30 min · Founder-focused</p>
          </div>
        </div>
      </div>
    </section>
  );
}
