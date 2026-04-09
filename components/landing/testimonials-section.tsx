"use client";

import { useI18n } from "@/lib/i18n";

const testimonials = [
  {
    id: 1,
    quote: {
      en: "VCReady helped us identify the gaps in our pitch before meeting investors. We closed our seed round 40% faster.",
      fr: "VCReady nous a aide a identifier les lacunes de notre pitch avant de rencontrer les investisseurs. Nous avons boucle notre seed 40% plus vite."
    },
    name: "Sarah M.",
    role: {
      en: "CEO & Co-founder",
      fr: "CEO & Co-fondatrice"
    },
    company: "Fintech Startup"
  },
  {
    id: 2,
    quote: {
      en: "The metrics calculator showed us exactly what investors would ask about. No more surprises in meetings.",
      fr: "Le calculateur de metriques nous a montre exactement ce que les investisseurs allaient demander. Plus de surprises en meeting."
    },
    name: "Thomas K.",
    role: {
      en: "Founder",
      fr: "Fondateur"
    },
    company: "SaaS B2B"
  },
  {
    id: 3,
    quote: {
      en: "Finally a tool that gives founders real numbers, not just theory. The valuation estimator was spot-on.",
      fr: "Enfin un outil qui donne aux fondateurs de vrais chiffres, pas juste de la theorie. L'estimateur de valorisation etait tres precis."
    },
    name: "Marie L.",
    role: {
      en: "CEO",
      fr: "CEO"
    },
    company: "HealthTech"
  },
  {
    id: 4,
    quote: {
      en: "We went from 'not ready' to 'investor ready' in 3 weeks. The readiness score kept us focused.",
      fr: "Nous sommes passes de 'pas pret' a 'pret pour les investisseurs' en 3 semaines. Le score de maturite nous a garde concentres."
    },
    name: "Anonymous",
    role: {
      en: "Founder",
      fr: "Fondateur"
    },
    company: "Series A Startup"
  }
];

export function TestimonialsSection() {
  const { locale, t } = useI18n();

  return (
    <section className="py-20 bg-soft">
      <div className="max-w-[var(--container-max)] mx-auto px-6">
        {/* Header */}
        <div className="max-w-xl mb-12">
          <p className="eyebrow mb-3">
            {locale === "en" ? "Trusted by founders" : "Approuve par les fondateurs"}
          </p>
          <h2 className="heading-section mb-4">
            {locale === "en" 
              ? "What founders say about VCReady." 
              : "Ce que les fondateurs disent de VCReady."}
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map((testimonial) => (
            <TestimonialCard 
              key={testimonial.id} 
              testimonial={testimonial} 
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ 
  testimonial, 
  locale 
}: { 
  testimonial: typeof testimonials[0]; 
  locale: "en" | "fr";
}) {
  return (
    <div className="bg-card border border-border rounded-[var(--radius-lg)] p-6">
      <blockquote className="text-ink-secondary leading-relaxed mb-5">
        &ldquo;{testimonial.quote[locale]}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-soft border border-border flex items-center justify-center">
          <span className="text-sm font-bold text-muted">
            {testimonial.name.charAt(0)}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold">{testimonial.name}</p>
          <p className="text-xs text-muted">
            {testimonial.role[locale]} &middot; {testimonial.company}
          </p>
        </div>
      </div>
    </div>
  );
}
