"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Locale = "en" | "fr";

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.valuation": "Valuation",
    "nav.metrics": "Metrics",
    "nav.pitch": "Pitch",
    "nav.dataroom": "Data Room",
    "nav.qa": "Q&A",
    "nav.captable": "Cap Table",
    "nav.readiness": "Readiness",
    "nav.signin": "Sign in",
    "nav.getStarted": "Get started",
    
    // Hero
    "hero.eyebrow": "Investor Readiness Platform",
    "hero.title": "Know exactly where you stand before your next raise.",
    "hero.subtitle": "VCReady helps founders assess their investor readiness, identify gaps, and prepare for successful fundraising.",
    "hero.cta.primary": "Start assessment",
    "hero.cta.secondary": "See how it works",
    
    // Stats
    "stats.founders": "Founders assessed",
    "stats.raised": "Total raised",
    "stats.accuracy": "Accuracy rate",
    "stats.time": "Avg. prep time saved",
    
    // Tools Section
    "tools.eyebrow": "Complete toolkit",
    "tools.title": "Everything you need to get investor-ready.",
    "tools.subtitle": "Six powerful tools designed to help you understand your position and close the gaps.",
    
    // Tool Cards
    "tool.valuation.title": "Valuation Estimator",
    "tool.valuation.desc": "Get a data-driven estimate of your company's valuation based on key metrics and market comparables.",
    "tool.metrics.title": "Metrics Tracker",
    "tool.metrics.desc": "Track and benchmark your key metrics against industry standards and investor expectations.",
    "tool.pitch.title": "Pitch Builder",
    "tool.pitch.desc": "Structure your pitch with proven frameworks and get feedback on positioning.",
    "tool.dataroom.title": "Data Room Checklist",
    "tool.dataroom.desc": "Ensure your data room is complete with our comprehensive due diligence checklist.",
    "tool.qa.title": "Investor Q&A Prep",
    "tool.qa.desc": "Prepare for tough investor questions with common questions and suggested answers.",
    "tool.readiness.title": "Readiness Score",
    "tool.readiness.desc": "Get your overall investor readiness score with actionable recommendations.",
    
    // How it works
    "howItWorks.eyebrow": "Simple process",
    "howItWorks.title": "Three steps to investor readiness.",
    "howItWorks.step1.title": "Assess",
    "howItWorks.step1.desc": "Complete our comprehensive assessment to understand where you stand.",
    "howItWorks.step2.title": "Identify",
    "howItWorks.step2.desc": "See exactly which areas need attention before you raise.",
    "howItWorks.step3.title": "Prepare",
    "howItWorks.step3.desc": "Use our tools to close the gaps and walk in ready.",
    
    // Final CTA
    "cta.eyebrow": "Ready to raise?",
    "cta.title": "Know your position before the first meeting.",
    "cta.subtitle": "VCReady gives you the tools and insights to walk into investor meetings with confidence. Stop guessing, start knowing.",
    "cta.primary": "Get started",
    "cta.secondary": "Try a tool first",
    
    // Footer
    "footer.by": "by",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome back",
    "dashboard.subtitle": "Here's your investor readiness overview.",
    "dashboard.summary.title": "Executive Summary",
    "dashboard.score.title": "Readiness Score",
    "dashboard.actions.title": "Priority Actions",
    "dashboard.quicklinks.title": "Quick Links",
    
    // Common
    "common.explore": "Explore",
    "common.start": "Start",
    "common.viewAll": "View all",
    "common.learnMore": "Learn more",
    
    // Cap Table
    "tool.captable.title": "Cap Table Manager",
    "tool.captable.desc": "Manage your cap table, track ownership, and model dilution scenarios for future rounds.",
    
    // Book a session
    "cta.bookSession": "Book a session",
    "cta.bookSession.desc": "Schedule a 30-minute call with our team to review your readiness.",
    
    // Newsletter
    "newsletter.title": "Stay updated",
    "newsletter.subtitle": "Get fundraising tips and platform updates.",
    "newsletter.placeholder": "Enter your email",
    "newsletter.cta": "Subscribe",
    
    // Footer links
    "footer.tools": "Tools",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
  },
  fr: {
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.valuation": "Valorisation",
    "nav.metrics": "Indicateurs",
    "nav.pitch": "Pitch",
    "nav.dataroom": "Data Room",
    "nav.qa": "Q&R",
    "nav.captable": "Cap Table",
    "nav.readiness": "Maturite",
    "nav.signin": "Connexion",
    "nav.getStarted": "Commencer",
    
    // Hero
    "hero.eyebrow": "Plateforme de preparation investisseur",
    "hero.title": "Sachez exactement ou vous en etes avant votre prochaine levee.",
    "hero.subtitle": "VCReady aide les fondateurs a evaluer leur maturite investisseur, identifier les lacunes et preparer une levee reussie.",
    "hero.cta.primary": "Commencer l'evaluation",
    "hero.cta.secondary": "Voir comment ca marche",
    
    // Stats
    "stats.founders": "Fondateurs evalues",
    "stats.raised": "Total leve",
    "stats.accuracy": "Taux de precision",
    "stats.time": "Temps de prep. economise",
    
    // Tools Section
    "tools.eyebrow": "Boite a outils complete",
    "tools.title": "Tout ce qu'il vous faut pour etre pret.",
    "tools.subtitle": "Six outils puissants concus pour comprendre votre position et combler les lacunes.",
    
    // Tool Cards
    "tool.valuation.title": "Estimateur de valorisation",
    "tool.valuation.desc": "Obtenez une estimation data-driven de la valorisation de votre entreprise basee sur vos metriques cles.",
    "tool.metrics.title": "Suivi des indicateurs",
    "tool.metrics.desc": "Suivez et comparez vos indicateurs cles aux standards du marche et attentes des investisseurs.",
    "tool.pitch.title": "Constructeur de pitch",
    "tool.pitch.desc": "Structurez votre pitch avec des frameworks eprouves et obtenez des retours sur votre positionnement.",
    "tool.dataroom.title": "Checklist Data Room",
    "tool.dataroom.desc": "Assurez-vous que votre data room est complete avec notre checklist exhaustive de due diligence.",
    "tool.qa.title": "Preparation Q&R Investisseur",
    "tool.qa.desc": "Preparez-vous aux questions difficiles avec les questions frequentes et reponses suggerees.",
    "tool.readiness.title": "Score de maturite",
    "tool.readiness.desc": "Obtenez votre score global de maturite investisseur avec des recommandations actionnables.",
    
    // How it works
    "howItWorks.eyebrow": "Processus simple",
    "howItWorks.title": "Trois etapes vers la maturite investisseur.",
    "howItWorks.step1.title": "Evaluez",
    "howItWorks.step1.desc": "Completez notre evaluation complete pour comprendre ou vous en etes.",
    "howItWorks.step2.title": "Identifiez",
    "howItWorks.step2.desc": "Voyez exactement quels domaines necessitent attention avant de lever.",
    "howItWorks.step3.title": "Preparez",
    "howItWorks.step3.desc": "Utilisez nos outils pour combler les lacunes et arriver pret.",
    
    // Final CTA
    "cta.eyebrow": "Pret a lever ?",
    "cta.title": "Connaissez votre position avant le premier meeting.",
    "cta.subtitle": "VCReady vous donne les outils et insights pour entrer en meeting investisseur avec confiance. Arretez de deviner, commencez a savoir.",
    "cta.primary": "Commencer",
    "cta.secondary": "Essayer un outil d'abord",
    
    // Footer
    "footer.by": "par",
    
    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.welcome": "Bon retour",
    "dashboard.subtitle": "Voici votre apercu de maturite investisseur.",
    "dashboard.summary.title": "Resume executif",
    "dashboard.score.title": "Score de maturite",
    "dashboard.actions.title": "Actions prioritaires",
    "dashboard.quicklinks.title": "Acces rapides",
    
    // Common
    "common.explore": "Explorer",
    "common.start": "Commencer",
    "common.viewAll": "Voir tout",
    "common.learnMore": "En savoir plus",
    
    // Cap Table
    "tool.captable.title": "Gestionnaire Cap Table",
    "tool.captable.desc": "Gerez votre cap table, suivez l'actionnariat et modelisez les scenarios de dilution.",
    
    // Book a session
    "cta.bookSession": "Reserver une session",
    "cta.bookSession.desc": "Planifiez un appel de 30 minutes avec notre equipe pour evaluer votre maturite.",
    
    // Newsletter
    "newsletter.title": "Restez informe",
    "newsletter.subtitle": "Recevez des conseils de levee et les actualites de la plateforme.",
    "newsletter.placeholder": "Votre email",
    "newsletter.cta": "S'abonner",
    
    // Footer links
    "footer.tools": "Outils",
    "footer.resources": "Ressources",
    "footer.legal": "Legal",
    "footer.privacy": "Confidentialite",
    "footer.terms": "Conditions",
  },
} as const;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[locale][key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-1 rounded transition-colors ${
          locale === "en"
            ? "bg-ink text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("fr")}
        className={`px-2 py-1 rounded transition-colors ${
          locale === "fr"
            ? "bg-ink text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        FR
      </button>
    </div>
  );
}
