"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Locale = "en" | "fr";

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.about": "About",
    "nav.valuation": "Valuation",
    "nav.metrics": "Metrics",
    "nav.pitch": "Pitch",
    "nav.dataroom": "Data Room",
    "nav.qa": "Q&A",
    "nav.captable": "Cap Table",
    "nav.comparables": "Comparables",
    "nav.readiness": "Readiness",
    "nav.signin": "Sign in",
    "nav.getStarted": "Get started",
    "nav.tools": "Tools",
    
    // Hero
    "hero.eyebrow": "Investor Readiness Platform",
    "hero.title": "Know if you're ready to raise.",
    "hero.subtitle": "VCReady helps founders assess their investor readiness, identify gaps, and prepare for successful fundraising with investor-grade tools.",
    "hero.cta.primary": "Analyze my startup",
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
    "tool.dataroom.kicker": "Data Room",
    "tool.dataroom.title": "Data Room Checklist",
    "tool.dataroom.desc": "Ensure your data room is complete with our comprehensive due diligence checklist.",
    "dataroom.readiness_score": "Readiness Score",
    "dataroom.documents_complete": "Documents Complete",
    "dataroom.required_missing": "Required Missing",
    "dataroom.readiness": "Investor Readiness",
    "dataroom.required": "Required",
    "dataroom.marked": "Marked",
    "dataroom.analysis": "Analysis",
    "common.reset": "Reset",
    "tool.qa.title": "Investor Q&A Prep",
    "tool.qa.desc": "Prepare for tough investor questions with common questions and suggested answers.",
    "tool.readiness.title": "Readiness Score",
    "tool.readiness.desc": "Get your overall investor readiness score with actionable recommendations.",
    "tool.captable.title": "Cap Table Manager",
    "tool.captable.desc": "Manage your cap table, track ownership, and model dilution scenarios for future rounds.",
    "tool.comparables.title": "Sector Comparables",
    "tool.comparables.desc": "Benchmark your startup against market comparables. Find the right valuation multiple and build your comparable analysis.",
    
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
    "cta.bookSession": "Book a session",
    "cta.bookSession.desc": "Schedule a 30-minute call with our team to review your readiness.",
    
    // Footer
    "footer.by": "by",
    "footer.tools": "Tools",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    
    // Newsletter
    "newsletter.title": "Stay updated",
    "newsletter.subtitle": "Get fundraising tips and platform updates.",
    "newsletter.placeholder": "Enter your email",
    "newsletter.cta": "Subscribe",
    "newsletter.success": "Thank you for subscribing!",
    "newsletter.error": "Please enter a valid email",
    
    // About section
    "about.title": "About VCReady",
    "about.para1": "VCReady was built to address a recurring issue observed across many startup ecosystems: founders often enter fundraising processes without fully understanding the metrics investors expect.",
    "about.para2": "In practice, this leads to a gap. Founders may have strong ideas, relevant markets, and real traction, but struggle to clearly articulate their performance through key indicators such as growth, unit economics, runway, or valuation logic. As a result, many are rejected — not necessarily because of the business itself, but because it is not presented in a structured, investor-ready way.",
    "about.para3": "VCReady was created to close that gap. The platform provides structured tools to help founders measure, understand, and improve their business before engaging with investors.",
    "about.founder.title": "Founder",
    "about.founder.name": "Yacine Chikhar",
    "about.founder.bio": "For more than 10 years, I have designed and managed programs supporting entrepreneurs, incubators, institutions, and government entities. Having worked with more than 100 entrepreneurs, I have developed programs and practical tools to structure startup support initiatives from early-stage to growth, based on international standards. My work focuses on innovation, ecosystem development, strategic partnerships, and execution. Through first-hand experience across startup ecosystems worldwide, I have built a strong international network of founders, experts, mentors, ecosystem enablers, and public sector stakeholders.",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome back",
    "dashboard.subtitle": "Here's your investor readiness overview.",
    "dashboard.summary.title": "Executive Summary",
    "dashboard.score.title": "Readiness Score",
    "dashboard.actions.title": "Priority Actions",
    "dashboard.quicklinks.title": "Quick Links",
    "dashboard.noData": "No saved results yet",
    "dashboard.startAssessment": "Start your first assessment",
    
    // Common
    "common.explore": "Explore",
    "common.start": "Start",
    "common.viewAll": "View all",
    "common.learnMore": "Learn more",
    "common.save": "Save",
    "common.reset": "Reset",
    "common.calculate": "Calculate",
    "common.saved": "Saved",
    "common.saveToDashboard": "Save to dashboard",
    "common.resultsUpdated": "Results update automatically",
    
    // Valuation Page
    "valuation.kicker": "VC Valuation Tool",
    "valuation.title": "Estimate your startup's value.",
    "valuation.description": "Calculate IRR, EV, CoCa and your Investor Score using the VC method. 26 sectors, 3 scenarios, What-If simulator.",
    "valuation.general": "General Information",
    "valuation.startupName": "Startup Name",
    "valuation.currency": "Currency",
    "valuation.sector": "Sector",
    "valuation.stage": "Stage",
    "valuation.exitAssumptions": "Exit Assumptions",
    "valuation.exitYear": "Exit Year",
    "valuation.exitYearHint": "Year the investor exits",
    "valuation.revenueAtExit": "Revenue at Exit",
    "valuation.revenueAtExitHint": "Projected revenue at exit year",
    "valuation.evMultiple": "EV/Revenue Multiple",
    "valuation.evMultipleHint": "Comparable sector multiple",
    "valuation.currentRevenue": "Current Annual Revenue",
    "valuation.investmentDetails": "Investment Details",
    "valuation.investmentAmount": "Investment Amount",
    "valuation.investmentAmountHint": "Amount being raised",
    "valuation.targetIRR": "Target IRR (%)",
    "valuation.targetIRRHint": "Investor's target return",
    "valuation.postMoney": "Post-Money Valuation",
    "valuation.postMoneyHint": "Valuation after investment",
    "valuation.dilution": "Dilution (%)",
    "valuation.dilutionHint": "Expected future dilution",
    "valuation.results": "Results",
    "valuation.preMoney": "Pre-Money Valuation",
    "valuation.exitValue": "Exit Value (EV)",
    "valuation.irr": "IRR",
    "valuation.investorScore": "Investor Score",
    "valuation.bearCase": "Bear Case",
    "valuation.baseCase": "Base Case",
    "valuation.bullCase": "Bull Case",
    "valuation.methodology": "Methodology",
    "valuation.methodologyDesc": "This calculator uses the VC method, which works backwards from a target exit to determine today's pre-money valuation.",
    
    // Sectors
    "sector.saas": "SaaS & Subscription",
    "sector.marketplace": "Marketplace & Commerce",
    "sector.fintech": "Fintech & Payments",
    "sector.deeptech": "Deeptech & Hardware",
    "sector.biotech": "Biotech & MedTech",
    "sector.consumer": "Consumer & D2C",
    "sector.agritech": "AgriTech & FoodTech",
    "sector.cleantech": "CleanTech & Energy",
    "sector.edtech": "EdTech",
    "sector.proptech": "PropTech & Real Estate",
    
    // Stages
    "stage.idea": "Idea / Pre-product",
    "stage.mvp": "MVP",
    "stage.seed": "Seed",
    "stage.seriesA": "Series A",
    "stage.seriesB": "Series B+",
    
    // Metrics Page
    "metrics.kicker": "Investor Metrics",
    "metrics.title": "Know your numbers before the room does.",
    "metrics.description": "Sector-specific KPIs investors will ask about. Calculate your unit economics, runway, and growth health.",
    "metrics.yourData": "Your Data",
    "metrics.mrr": "Monthly Recurring Revenue (MRR)",
    "metrics.mrrHint": "Total recurring revenue this month",
    "metrics.newCustomers": "New Customers / Month",
    "metrics.newCustomersHint": "Paying customers acquired",
    "metrics.churnedCustomers": "Churned Customers / Month",
    "metrics.churnedCustomersHint": "Paying customers lost",
    "metrics.cacSpend": "Sales & Marketing Spend",
    "metrics.cacSpendHint": "All acquisition costs",
    "metrics.totalCustomers": "Total Active Customers",
    "metrics.totalCustomersHint": "Current paying customer base",
    "metrics.grossMargin": "Gross Margin (%)",
    "metrics.grossMarginHint": "Revenue minus COGS as % of revenue",
    "metrics.calculateBtn": "Calculate metrics",
    "metrics.arr": "Annual Recurring Revenue",
    "metrics.cac": "Customer Acquisition Cost",
    "metrics.ltv": "Customer Lifetime Value",
    "metrics.ltvCacRatio": "LTV:CAC Ratio",
    "metrics.netRevRetention": "Net Revenue Retention",
    "metrics.churnRate": "Churn Rate",
    "metrics.runway": "Runway Analysis",
    "metrics.runwayMonths": "Estimated runway at current burn",
    "metrics.analysis": "Analysis & Insights",
    "metrics.benchmark": "Industry benchmark",
    
    // Pitch Page
    "pitch.kicker": "Pitch Analyzer",
    "pitch.title": "Build a pitch that resonates.",
    "pitch.description": "Structure and validate your pitch against what investors actually look for. Section-by-section feedback.",
    "pitch.pitchScore": "Pitch Score",
    "pitch.investorReady": "Investor Ready",
    "pitch.goodProgress": "Good Progress",
    "pitch.needsWork": "Needs Work",
    "pitch.sections": "Pitch Sections",
    "pitch.improvements": "Priority Improvements",
    "pitch.section.problem": "Problem",
    "pitch.section.solution": "Solution",
    "pitch.section.market": "Market Size",
    "pitch.section.traction": "Traction",
    "pitch.section.business": "Business Model",
    "pitch.section.competition": "Competition",
    "pitch.section.team": "Team",
    "pitch.section.financials": "Financials",
    "pitch.section.ask": "The Ask",
    "pitch.complete": "Complete",
    "pitch.warning": "Needs attention",
    "pitch.incomplete": "Incomplete",
    "pitch.enterContent": "Enter your pitch content",
    "pitch.analyze": "Analyze pitch",
    
    // Data Room Page
    "dataroom.kicker": "Data Room",
    "dataroom.title": "Build an investor-ready data room.",
    "dataroom.description": "Track your progress and ensure nothing is missing when investors start due diligence.",
    "dataroom.corporate": "Corporate Documents",
    "dataroom.financial": "Financial Documents",
    "dataroom.legal": "Legal Documents",
    "dataroom.product": "Product & Tech",
    "dataroom.team": "Team & HR",
    
    // Q&A Page
    "qa.kicker": "Investor Q&A",
    "qa.title": "Prepare for tough questions.",
    "qa.description": "The questions investors will ask, and how to answer them. Practice mode included.",
    "qa.category": "Category",
    "qa.question": "Question",
    "qa.suggestedAnswer": "Suggested Answer",
    "qa.yourAnswer": "Your Answer",
    "qa.practice": "Practice Mode",
    "qa.revealAnswer": "Reveal answer",
    "qa.nextQuestion": "Next question",
    
    // Readiness Page
    "readiness.kicker": "Readiness Score",
    "readiness.title": "How investor-ready are you?",
    "readiness.description": "Get your comprehensive readiness score with actionable recommendations.",
    "readiness.overallScore": "Overall Score",
    "readiness.breakdown": "Score Breakdown",
    "readiness.insights": "Insights",
    "readiness.actionPlan": "Action Plan",
    
    // Cap Table Page
    "captable.kicker": "Cap Table",
    "captable.title": "Manage your ownership.",
    "captable.description": "Track shareholders, model dilution scenarios, and prepare for your next round.",
    "captable.shareholders": "Shareholders",
    "captable.ownership": "Ownership",
    "captable.dilutionSim": "Dilution Simulator",
    "captable.postRound": "Post-Round Preview",
  },
  fr: {
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.about": "À propos",
    "nav.valuation": "Valorisation",
    "nav.metrics": "Indicateurs",
    "nav.pitch": "Pitch",
    "nav.dataroom": "Data Room",
    "nav.qa": "Q&R",
    "nav.captable": "Cap Table",
    "nav.comparables": "Comparables",
    "nav.readiness": "Maturite",
    "nav.signin": "Connexion",
    "nav.getStarted": "Commencer",
    "nav.tools": "Outils",
    
    // Hero
    "hero.eyebrow": "Plateforme de preparation investisseur",
    "hero.title": "Sachez si vous etes pret a lever des fonds.",
    "hero.subtitle": "VCReady aide les fondateurs a evaluer leur maturite investisseur, identifier les lacunes et preparer une levee reussie avec des outils professionnels.",
    "hero.cta.primary": "Analyser ma startup",
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
    "dataroom.readiness_score": "Score de Maturite",
    "dataroom.documents_complete": "Documents Complets",
    "dataroom.required_missing": "Elements Requis Manquants",
    "dataroom.readiness": "Maturite Investisseurs",
    "dataroom.required": "Requis",
    "dataroom.marked": "Marque",
    "dataroom.analysis": "Analyse",
    "common.save": "Enregistrer",
    "common.reset": "Reinitialiser",
    "tool.qa.title": "Preparation Q&R Investisseur",
    "tool.qa.desc": "Preparez-vous aux questions difficiles avec les questions frequentes et reponses suggerees.",
    "tool.readiness.title": "Score de maturite",
    "tool.readiness.desc": "Obtenez votre score global de maturite investisseur avec des recommandations actionnables.",
    "tool.captable.title": "Gestionnaire Cap Table",
    "tool.captable.desc": "Gerez votre cap table, suivez l'actionnariat et modelisez les scenarios de dilution.",
    "tool.comparables.title": "Comparables de Secteur",
    "tool.comparables.desc": "Comparez votre startup avec des comparables du marche. Trouvez le bon multiple de valorisation et construisez votre analyse.",
    
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
    "cta.bookSession": "Reserver une session",
    "cta.bookSession.desc": "Planifiez un appel de 30 minutes avec notre equipe pour evaluer votre maturite.",
    
    // Footer
    "footer.by": "par",
    "footer.tools": "Outils",
    "footer.resources": "Ressources",
    "footer.legal": "Legal",
    "footer.privacy": "Confidentialite",
    "footer.terms": "Conditions",
    
    // Newsletter
    "newsletter.title": "Restez informe",
    "newsletter.subtitle": "Recevez des conseils de levee et les actualites de la plateforme.",
    "newsletter.placeholder": "Votre email",
    "newsletter.cta": "S'abonner",
    "newsletter.success": "Merci pour votre inscription !",
    "newsletter.error": "Veuillez entrer un email valide",
    
    // About section
    "about.title": "À propos de VCReady",
    "about.para1": "VCReady est né d'un constat simple observé dans de nombreux écosystèmes startup : beaucoup de fondateurs abordent la levée de fonds sans maîtriser les métriques attendues par les investisseurs.",
    "about.para2": "Dans la pratique, cela crée un décalage. Les fondateurs peuvent avoir de bonnes idées, un marché pertinent et même de la traction, mais peinent à structurer leur discours autour d'indicateurs clés comme la croissance, les unit economics, le runway ou la logique de valorisation. En conséquence, ils sont souvent rejetés, non pas à cause du projet, mais faute de clarté et de structuration.",
    "about.para3": "VCReady a été conçu pour combler cet écart. La plateforme propose des outils structurés pour aider les fondateurs à mieux comprendre leur activité et à se préparer efficacement avant d'engager des discussions avec des investisseurs.",
    "about.founder.title": "Fondateur",
    "about.founder.name": "Yacine Chikhar",
    "about.founder.bio": "Depuis plus de 10 ans, je conçois et pilote des programmes d'accompagnement destinés aux entrepreneurs, incubateurs, institutions et acteurs publics. Ayant accompagné plus de 100 entrepreneurs, j'ai développé des programmes et des outils pratiques permettant de structurer l'accompagnement des startups, de l'early-stage à la croissance, en m'appuyant sur des standards internationaux. Mon travail s'articule autour de l'innovation, du développement des écosystèmes, des partenariats stratégiques et de l'exécution. Grâce à une expérience directe dans plusieurs écosystèmes startup à l'international, j'ai constitué un réseau solide de fondateurs, experts, mentors, acteurs de l'écosystème et institutions publiques.",
    
    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.welcome": "Bon retour",
    "dashboard.subtitle": "Voici votre apercu de maturite investisseur.",
    "dashboard.summary.title": "Resume executif",
    "dashboard.score.title": "Score de maturite",
    "dashboard.actions.title": "Actions prioritaires",
    "dashboard.quicklinks.title": "Acces rapides",
    "dashboard.noData": "Pas encore de resultats",
    "dashboard.startAssessment": "Commencez votre premiere evaluation",
    
    // Common
    "common.explore": "Explorer",
    "common.start": "Commencer",
    "common.viewAll": "Voir tout",
    "common.learnMore": "En savoir plus",
    "common.save": "Enregistrer",
    "common.reset": "Reinitialiser",
    "common.calculate": "Calculer",
    "common.saved": "Enregistre",
    "common.saveToDashboard": "Sauvegarder",
    "common.resultsUpdated": "Les resultats se mettent a jour automatiquement",
    
    // Valuation Page
    "valuation.kicker": "Outil de Valorisation VC",
    "valuation.title": "Estimez la valeur de votre startup.",
    "valuation.description": "Calculez IRR, EV, CoCa et votre Score Investisseur avec la methode VC. 26 secteurs, 3 scenarios, simulateur What-If.",
    "valuation.general": "Informations Generales",
    "valuation.startupName": "Nom de la startup",
    "valuation.currency": "Devise",
    "valuation.sector": "Secteur",
    "valuation.stage": "Stade",
    "valuation.exitAssumptions": "Hypotheses de Sortie",
    "valuation.exitYear": "Annee de sortie",
    "valuation.exitYearHint": "Annee de sortie de l'investisseur",
    "valuation.revenueAtExit": "Chiffre d'affaires a la sortie",
    "valuation.revenueAtExitHint": "CA projete a l'annee de sortie",
    "valuation.evMultiple": "Multiple EV/CA",
    "valuation.evMultipleHint": "Multiple comparable du secteur",
    "valuation.currentRevenue": "CA Annuel Actuel",
    "valuation.investmentDetails": "Details de l'Investissement",
    "valuation.investmentAmount": "Montant de l'investissement",
    "valuation.investmentAmountHint": "Montant a lever",
    "valuation.targetIRR": "TRI cible (%)",
    "valuation.targetIRRHint": "Rendement cible de l'investisseur",
    "valuation.postMoney": "Valorisation Post-Money",
    "valuation.postMoneyHint": "Valorisation apres investissement",
    "valuation.dilution": "Dilution (%)",
    "valuation.dilutionHint": "Dilution future estimee",
    "valuation.results": "Resultats",
    "valuation.preMoney": "Valorisation Pre-Money",
    "valuation.exitValue": "Valeur de Sortie (EV)",
    "valuation.irr": "TRI",
    "valuation.investorScore": "Score Investisseur",
    "valuation.bearCase": "Scenario Pessimiste",
    "valuation.baseCase": "Scenario Base",
    "valuation.bullCase": "Scenario Optimiste",
    "valuation.methodology": "Methodologie",
    "valuation.methodologyDesc": "Ce calculateur utilise la methode VC, qui part d'une sortie cible pour determiner la valorisation pre-money actuelle.",
    
    // Sectors
    "sector.saas": "SaaS & Abonnement",
    "sector.marketplace": "Marketplace & Commerce",
    "sector.fintech": "Fintech & Paiements",
    "sector.deeptech": "Deeptech & Hardware",
    "sector.biotech": "Biotech & MedTech",
    "sector.consumer": "Consumer & D2C",
    "sector.agritech": "AgriTech & FoodTech",
    "sector.cleantech": "CleanTech & Energie",
    "sector.edtech": "EdTech",
    "sector.proptech": "PropTech & Immobilier",
    
    // Stages
    "stage.idea": "Idee / Pre-produit",
    "stage.mvp": "MVP",
    "stage.seed": "Seed",
    "stage.seriesA": "Serie A",
    "stage.seriesB": "Serie B+",
    
    // Metrics Page
    "metrics.kicker": "Indicateurs Investisseur",
    "metrics.title": "Connaissez vos chiffres avant la salle.",
    "metrics.description": "KPIs specifiques par secteur que les investisseurs demanderont. Calculez votre unit economics, runway et sante de croissance.",
    "metrics.yourData": "Vos Donnees",
    "metrics.mrr": "Revenu Mensuel Recurrent (MRR)",
    "metrics.mrrHint": "Revenu recurrent total ce mois",
    "metrics.newCustomers": "Nouveaux Clients / Mois",
    "metrics.newCustomersHint": "Clients payants acquis",
    "metrics.churnedCustomers": "Clients Perdus / Mois",
    "metrics.churnedCustomersHint": "Clients payants perdus",
    "metrics.cacSpend": "Depenses Sales & Marketing",
    "metrics.cacSpendHint": "Tous les couts d'acquisition",
    "metrics.totalCustomers": "Clients Actifs Total",
    "metrics.totalCustomersHint": "Base de clients payants actuelle",
    "metrics.grossMargin": "Marge Brute (%)",
    "metrics.grossMarginHint": "CA moins COGS en % du CA",
    "metrics.calculateBtn": "Calculer les indicateurs",
    "metrics.arr": "Revenu Annuel Recurrent",
    "metrics.cac": "Cout d'Acquisition Client",
    "metrics.ltv": "Valeur Vie Client",
    "metrics.ltvCacRatio": "Ratio LTV:CAC",
    "metrics.netRevRetention": "Retention Nette des Revenus",
    "metrics.churnRate": "Taux de Churn",
    "metrics.runway": "Analyse du Runway",
    "metrics.runwayMonths": "Runway estime au burn actuel",
    "metrics.analysis": "Analyse & Insights",
    "metrics.benchmark": "Benchmark du secteur",
    
    // Pitch Page
    "pitch.kicker": "Analyseur de Pitch",
    "pitch.title": "Construisez un pitch qui resonne.",
    "pitch.description": "Structurez et validez votre pitch contre ce que les investisseurs recherchent vraiment. Feedback section par section.",
    "pitch.pitchScore": "Score du Pitch",
    "pitch.investorReady": "Pret pour les investisseurs",
    "pitch.goodProgress": "Bonne progression",
    "pitch.needsWork": "A ameliorer",
    "pitch.sections": "Sections du Pitch",
    "pitch.improvements": "Ameliorations Prioritaires",
    "pitch.section.problem": "Probleme",
    "pitch.section.solution": "Solution",
    "pitch.section.market": "Taille du Marche",
    "pitch.section.traction": "Traction",
    "pitch.section.business": "Modele Economique",
    "pitch.section.competition": "Concurrence",
    "pitch.section.team": "Equipe",
    "pitch.section.financials": "Finances",
    "pitch.section.ask": "La Demande",
    "pitch.complete": "Complete",
    "pitch.warning": "Attention requise",
    "pitch.incomplete": "Incomplete",
    "pitch.enterContent": "Entrez le contenu de votre pitch",
    "pitch.analyze": "Analyser le pitch",
    
    // Data Room Page
    "dataroom.kicker": "Data Room",
    "dataroom.title": "Construisez une data room prete pour les investisseurs.",
    "dataroom.description": "Suivez votre progression et assurez-vous que rien ne manque quand les investisseurs commenceront la due diligence.",
    "dataroom.corporate": "Documents Societe",
    "dataroom.financial": "Documents Financiers",
    "dataroom.legal": "Documents Juridiques",
    "dataroom.product": "Produit & Tech",
    "dataroom.team": "Equipe & RH",
    
    // Q&A Page
    "qa.kicker": "Q&R Investisseur",
    "qa.title": "Preparez-vous aux questions difficiles.",
    "qa.description": "Les questions que les investisseurs poseront, et comment y repondre. Mode entrainement inclus.",
    "qa.category": "Categorie",
    "qa.question": "Question",
    "qa.suggestedAnswer": "Reponse Suggeree",
    "qa.yourAnswer": "Votre Reponse",
    "qa.practice": "Mode Entrainement",
    "qa.revealAnswer": "Voir la reponse",
    "qa.nextQuestion": "Question suivante",
    
    // Readiness Page
    "readiness.kicker": "Score de Maturite",
    "readiness.title": "A quel point etes-vous pret ?",
    "readiness.description": "Obtenez votre score de maturite complet avec des recommandations actionnables.",
    "readiness.overallScore": "Score Global",
    "readiness.breakdown": "Detail du Score",
    "readiness.insights": "Insights",
    "readiness.actionPlan": "Plan d'Action",
    
    // Cap Table Page
    "captable.kicker": "Cap Table",
    "captable.title": "Gerez votre actionnariat.",
    "captable.description": "Suivez les actionnaires, modelisez les scenarios de dilution et preparez votre prochain tour.",
    "captable.shareholders": "Actionnaires",
    "captable.ownership": "Actionnariat",
    "captable.dilutionSim": "Simulateur de Dilution",
    "captable.postRound": "Apercu Post-Round",
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
