/**
 * VCReady — Investor-Ready PDF Report Generator
 *
 * Pure client-side. Uses jsPDF directly (no canvas/screenshot).
 * Consistent branding: dark ink headings, accent green, monospaced numbers.
 */

import type { LocalReadinessData } from "./local-readiness";
import type { FounderProfile } from "./onboard";

// ─── Brand constants ──────────────────────────────────────────────────────────

const C = {
  ink:      [15,  15,  15]  as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  accent:   [34,  107, 71]  as [number, number, number],  // VCReady green
  muted:    [120, 120, 120] as [number, number, number],
  soft:     [245, 245, 242] as [number, number, number],
  border:   [220, 220, 215] as [number, number, number],
  danger:   [200, 50,  50]  as [number, number, number],
  warning:  [180, 120, 0]   as [number, number, number],
};

const PAGE_W  = 210; // A4 mm
const PAGE_H  = 297;
const MARGIN  = 20;
const COL_W   = PAGE_W - MARGIN * 2;
const CALENDLY = "calendly.com/vcready/30min";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function readinessLevel(score: number): string {
  if (score >= 80) return "Investor Ready";
  if (score >= 60) return "Almost Ready";
  if (score >= 35) return "Developing";
  return "Early Stage";
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 70) return C.accent;
  if (score >= 40) return C.warning;
  return C.danger;
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

function drawProgressBar(
  doc: import("jspdf").jsPDF,
  x: number, y: number, w: number, h: number,
  value: number
) {
  // Track
  doc.setFillColor(...C.soft);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  // Fill
  if (value > 0) {
    doc.setFillColor(...scoreColor(value));
    doc.roundedRect(x, y, Math.max((value / 100) * w, h), h, h / 2, h / 2, "F");
  }
}

function drawBullet(doc: import("jspdf").jsPDF, x: number, y: number) {
  doc.setFillColor(...C.accent);
  doc.circle(x, y - 0.8, 1.2, "F");
}

function sectionHeader(
  doc: import("jspdf").jsPDF,
  label: string, y: number
): number {
  doc.setFillColor(...C.soft);
  doc.rect(MARGIN, y, COL_W, 8, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), MARGIN + 4, y + 5.2);
  return y + 12;
}

// ─── Page management ──────────────────────────────────────────────────────────

function newPage(doc: import("jspdf").jsPDF): number {
  doc.addPage();
  // Subtle top bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, PAGE_W, 1.5, "F");
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.text("VCReady · Investor Readiness Report · Confidential", MARGIN, PAGE_H - 8);
  doc.text(
    `Page ${(doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()}`,
    PAGE_W - MARGIN, PAGE_H - 8,
    { align: "right" }
  );
  return 20;
}

function maybeBreak(
  doc: import("jspdf").jsPDF,
  y: number,
  needed: number
): number {
  if (y + needed > PAGE_H - 20) return newPage(doc);
  return y;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePDFReport(
  data: LocalReadinessData,
  profile: FounderProfile
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── COVER PAGE ──────────────────────────────────────────────────────────────

  // Dark background
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Green accent stripe top
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, PAGE_W, 3, "F");

  // VCReady wordmark
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("VCReady", MARGIN, 45);

  // Tagline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 170);
  doc.text("Investor Readiness Platform", MARGIN, 53);

  // Divider
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 60, PAGE_W - MARGIN, 60);

  // Report title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Investor-Ready", MARGIN, 82);
  doc.text("Report", MARGIN, 95);

  // Score badge
  const badgeX = PAGE_W - MARGIN - 38;
  doc.setFillColor(...scoreColor(data.overall_score));
  doc.roundedRect(badgeX - 4, 74, 46, 26, 3, 3, "F");
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(`${data.overall_score}`, badgeX + 5, 88, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("/100", badgeX + 14, 88);
  doc.setFontSize(7);
  doc.text(readinessLevel(data.overall_score).toUpperCase(), badgeX + 23, 96, { align: "center" });

  // Startup info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(profile.startupName || "Your Startup", MARGIN, 125);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 170);
  doc.text(`Founder: ${profile.name}`, MARGIN, 134);
  if (profile.sector) doc.text(`Sector: ${profile.sector}  ·  Stage: ${profile.stage}`, MARGIN, 141);
  doc.text(`Generated: ${date}`, MARGIN, 148);

  // Scores preview strip
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(MARGIN, 165, COL_W, 60, 4, 4, "F");

  const scoreItems = [
    { label: "Metrics & Traction", score: data.metrics_score,   weight: "35%" },
    { label: "Q&A Preparation",    score: data.qa_score,         weight: "25%" },
    { label: "Valuation",          score: data.valuation_score,  weight: "20%" },
    { label: "Cap Table",          score: data.cap_table_score,  weight: "10%" },
    { label: "Pitch Deck",         score: data.pitch_score,      weight: "5%"  },
    { label: "Data Room",          score: data.dataroom_score,   weight: "5%"  },
  ];

  let si = 170;
  scoreItems.forEach((item) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 150);
    doc.text(item.label, MARGIN + 6, si + 3.5);
    doc.text(item.weight, MARGIN + 6 + 58, si + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor(item.score));
    doc.text(`${item.score}%`, MARGIN + 6 + 74, si + 3.5);
    drawProgressBar(doc, MARGIN + 6 + 84, si, COL_W - 100, 3.5, item.score);
    si += 8.5;
  });

  // Footer on cover
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("This report is confidential and generated for investor preparation purposes only.", MARGIN, PAGE_H - 12);
  doc.text(`${CALENDLY}`, PAGE_W - MARGIN, PAGE_H - 12, { align: "right" });
  doc.setTextColor(...C.accent);

  // ── PAGE 2: EXECUTIVE SUMMARY + SCORE BREAKDOWN ─────────────────────────────

  let y = newPage(doc);

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text("Executive Summary", MARGIN, y);
  y += 12;

  // Score hero
  doc.setFillColor(...C.soft);
  doc.roundedRect(MARGIN, y, COL_W, 28, 3, 3, "F");

  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...scoreColor(data.overall_score));
  doc.text(`${data.overall_score}`, MARGIN + 12, y + 19);

  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text("/ 100", MARGIN + 30, y + 19);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text(readinessLevel(data.overall_score), MARGIN + 50, y + 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  const summaryText = getReadinessSummary(data.overall_score, profile.startupName);
  const summaryLines = doc.splitTextToSize(summaryText, COL_W - 55);
  doc.text(summaryLines, MARGIN + 50, y + 19);
  y += 34;

  // Strengths + Weaknesses
  const { strengths, weaknesses } = getStrengthsWeaknesses(data);
  const colMid = MARGIN + COL_W / 2 + 4;
  const colW2  = COL_W / 2 - 6;

  y = maybeBreak(doc, y, 50);

  // Strengths box
  doc.setFillColor(245, 252, 248);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, colW2, 42, 3, 3, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.accent);
  doc.text("✓  STRENGTHS", MARGIN + 5, y + 6);
  strengths.forEach((s, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(`${i + 1}. ${s}`, colW2 - 10);
    doc.text(lines, MARGIN + 5, y + 14 + i * 10);
  });

  // Weaknesses box
  doc.setFillColor(255, 250, 245);
  doc.setDrawColor(...C.warning);
  doc.roundedRect(colMid, y, colW2, 42, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.warning);
  doc.text("⚠  AREAS TO IMPROVE", colMid + 5, y + 6);
  weaknesses.forEach((w, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(`${i + 1}. ${w}`, colW2 - 10);
    doc.text(lines, colMid + 5, y + 14 + i * 10);
  });
  y += 50;

  // Score Breakdown
  y = maybeBreak(doc, y, 10);
  y = sectionHeader(doc, "Score Breakdown — by tool weight", y);

  scoreItems.forEach((item) => {
    y = maybeBreak(doc, y, 14);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.ink);
    doc.text(item.label, MARGIN, y + 3.5);
    doc.setTextColor(...C.muted);
    doc.text(item.weight, MARGIN + 68, y + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor(item.score));
    doc.text(`${item.score}%`, PAGE_W - MARGIN, y + 3.5, { align: "right" });
    drawProgressBar(doc, MARGIN + 78, y + 0.5, COL_W - 98, 5, item.score);
    y += 11;
  });

  // ── PAGE 3: INSIGHTS + ACTION PLAN ──────────────────────────────────────────

  y = newPage(doc);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text("Key Insights", MARGIN, y);
  y += 12;

  const insights = getInsights(data, profile);
  insights.forEach((insight, i) => {
    y = maybeBreak(doc, y, 20);
    // Card bg
    doc.setFillColor(...C.soft);
    doc.roundedRect(MARGIN, y, COL_W, 18, 2, 2, "F");
    // Number badge
    doc.setFillColor(...C.accent);
    doc.circle(MARGIN + 7, y + 9, 4, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(String(i + 1), MARGIN + 7, y + 11.5, { align: "center" });
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text(insight.title, MARGIN + 16, y + 7);
    // Body
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    const lines = doc.splitTextToSize(insight.body, COL_W - 20);
    doc.text(lines, MARGIN + 16, y + 13);
    y += 22;
  });

  y += 4;
  y = maybeBreak(doc, y, 10);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.ink);
  doc.text("Action Plan", MARGIN, y);
  y += 12;

  const actions = getActionPlan(data);
  actions.forEach((action, i) => {
    y = maybeBreak(doc, y, 22);
    drawBullet(doc, MARGIN + 2, y + 5.5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text(`${i + 1}. ${action.title}`, MARGIN + 7, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    const lines = doc.splitTextToSize(action.body, COL_W - 12);
    doc.text(lines, MARGIN + 7, y + 11);
    y += 8 + lines.length * 5;
  });

  // ── PAGE 4: VALUATION + CTA ──────────────────────────────────────────────────

  y = newPage(doc);

  if (data.estimated_valuation > 0) {
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.ink);
    doc.text("Valuation Summary", MARGIN, y);
    y += 12;

    // Main valuation card
    doc.setFillColor(...C.soft);
    doc.roundedRect(MARGIN, y, COL_W, 32, 3, 3, "F");

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.accent);
    doc.text(fmt(data.estimated_valuation), MARGIN + 10, y + 17);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text("Estimated Valuation", MARGIN + 10, y + 24);

    if (data.sector) {
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(`${data.stage || ""}  ·  ${data.sector}`, PAGE_W - MARGIN, y + 17, { align: "right" });
    }
    if (data.growth_rate > 0) {
      doc.text(`Growth: ${data.growth_rate.toFixed(0)}% YoY`, PAGE_W - MARGIN, y + 24, { align: "right" });
    }
    y += 40;

    const valuationNote =
      "This estimate is based on your provided inputs using the VC Method and revenue multiples " +
      "typical for your sector and stage. Actual investor valuations may vary based on traction, " +
      "team, market conditions, and negotiation.";
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    const vLines = doc.splitTextToSize(valuationNote, COL_W);
    doc.text(vLines, MARGIN, y);
    y += vLines.length * 5 + 10;

    if (data.mrr > 0) {
      y = maybeBreak(doc, y, 28);
      y = sectionHeader(doc, "Key Metrics", y);
      const metrics = [
        { label: "Monthly Recurring Revenue (MRR)", value: fmt(data.mrr) },
        { label: "Annual Recurring Revenue (ARR)",  value: fmt(data.arr || data.mrr * 12) },
        data.runway > 0 ? { label: "Runway", value: `${Math.round(data.runway)} months` } : null,
        data.ltv_cac > 0 ? { label: "LTV:CAC Ratio", value: `${data.ltv_cac.toFixed(1)}x` } : null,
      ].filter(Boolean) as { label: string; value: string }[];

      metrics.forEach((m) => {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.ink);
        doc.text(m.label, MARGIN, y + 3.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.accent);
        doc.text(m.value, PAGE_W - MARGIN, y + 3.5, { align: "right" });
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
        y += 10;
      });
      y += 6;
    }
  }

  // CTA Section — dark box
  y = maybeBreak(doc, y, 55);
  doc.setFillColor(...C.ink);
  doc.roundedRect(MARGIN, y, COL_W, 52, 4, 4, "F");

  doc.setFillColor(...C.accent);
  doc.rect(MARGIN, y, 3, 52, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 200, 160);
  doc.text("EXPERT GUIDANCE", MARGIN + 10, y + 9);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  const ctaLines = doc.splitTextToSize(
    "Need help turning this into an investor-ready plan?",
    COL_W - 14
  );
  doc.text(ctaLines, MARGIN + 10, y + 17);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(170, 170, 160);
  doc.text(
    "Book a free 30-minute Founder Readiness Review. We'll walk through your score,",
    MARGIN + 10, y + 32
  );
  doc.text(
    "close the gaps, and sharpen your fundraising strategy before you approach investors.",
    MARGIN + 10, y + 38
  );

  // Button-style link
  doc.setFillColor(...C.accent);
  doc.roundedRect(MARGIN + 10, y + 42, 70, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Book a Founder Readiness Review →", MARGIN + 45, y + 47.5, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 90);
  doc.text(CALENDLY, PAGE_W - MARGIN, y + 47, { align: "right" });

  doc.save(`VCReady-Report-${(profile.startupName || "Startup").replace(/\s+/g, "-")}-${new Date().getFullYear()}.pdf`);
}

// ─── Content generators ───────────────────────────────────────────────────────

function getReadinessSummary(score: number, startup: string): string {
  const name = startup || "Your startup";
  if (score >= 80) return `${name} is investor-ready. Your scores reflect strong preparation across most key areas. Focus on maintaining momentum and closing any remaining gaps before your next pitch.`;
  if (score >= 60) return `${name} is on track. You have a solid foundation across key areas. A few targeted improvements will push you into investor-ready territory.`;
  if (score >= 35) return `${name} is developing. You've made meaningful progress, but several areas need attention before approaching investors. Focus on your highest-weight metrics first.`;
  return `${name} is at an early stage. Your assessment reveals key gaps to address before raising. Use this report as your prioritized roadmap.`;
}

function getStrengthsWeaknesses(data: LocalReadinessData): {
  strengths: string[];
  weaknesses: string[];
} {
  const tools = [
    { label: "Metrics & Traction",  score: data.metrics_score,   weight: 35 },
    { label: "Q&A Preparation",     score: data.qa_score,         weight: 25 },
    { label: "Valuation",           score: data.valuation_score,  weight: 20 },
    { label: "Cap Table",           score: data.cap_table_score,  weight: 10 },
    { label: "Pitch Deck",          score: data.pitch_score,      weight: 5  },
    { label: "Data Room",           score: data.dataroom_score,   weight: 5  },
  ].filter((t) => t.score > 0);

  const sorted = [...tools].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .filter((t) => t.score >= 60)
    .slice(0, 3)
    .map((t) => `${t.label} — ${t.score}%`);
  const weaknesses = sorted
    .filter((t) => t.score < 60)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((t) => `${t.label} — ${t.score}% (${t.weight}% of total score)`);

  return {
    strengths: strengths.length ? strengths : ["Assessment in progress — complete more tools to unlock strengths"],
    weaknesses: weaknesses.length ? weaknesses : ["Complete all tools to identify improvement areas"],
  };
}

function getInsights(
  data: LocalReadinessData,
  profile: FounderProfile
): { title: string; body: string }[] {
  const insights: { title: string; body: string }[] = [];

  // Strongest area
  const topTool = [
    { label: "Metrics & Traction",  score: data.metrics_score  },
    { label: "Q&A Preparation",     score: data.qa_score       },
    { label: "Valuation",           score: data.valuation_score},
    { label: "Cap Table",           score: data.cap_table_score},
    { label: "Pitch Deck",          score: data.pitch_score    },
    { label: "Data Room",           score: data.dataroom_score },
  ].filter(t => t.score > 0).sort((a, b) => b.score - a.score)[0];

  if (topTool) {
    insights.push({
      title: `Strongest area: ${topTool.label}`,
      body: `At ${topTool.score}%, this is your most developed area. Use it as an anchor in your investor conversations.`,
    });
  }

  // Highest-weight weakness
  const weakTool = [
    { label: "Metrics & Traction",  score: data.metrics_score,   weight: 35 },
    { label: "Q&A Preparation",     score: data.qa_score,         weight: 25 },
    { label: "Valuation",           score: data.valuation_score,  weight: 20 },
    { label: "Cap Table",           score: data.cap_table_score,  weight: 10 },
  ].filter(t => t.score < 70).sort((a, b) => b.weight - a.weight)[0];

  if (weakTool) {
    insights.push({
      title: `Biggest score lever: ${weakTool.label}`,
      body: `At ${weakTool.score}% and ${weakTool.weight}% of your total score, improving this area has the highest impact on your overall readiness.`,
    });
  }

  // Runway risk
  if (data.runway > 0 && data.runway < 18) {
    insights.push({
      title: "Runway risk before fundraising",
      body: `Your current runway of ${Math.round(data.runway)} months is below the 18-month threshold most investors look for. Consider extending before starting your raise to avoid negotiating from a weak position.`,
    });
  }

  // Valuation
  if (data.estimated_valuation > 0) {
    insights.push({
      title: "Valuation benchmark established",
      body: `Your estimated valuation of ${fmt(data.estimated_valuation)} provides a starting anchor for investor conversations. Make sure your traction supports this range.`,
    });
  }

  // Sector context
  if (profile.sector) {
    insights.push({
      title: `${profile.sector} sector context`,
      body: `As a ${profile.stage || "startup"} in ${profile.sector}, investors will benchmark your metrics against sector-specific standards. Ensure your KPIs align with investor expectations for your space.`,
    });
  }

  return insights.slice(0, 5);
}

function getActionPlan(data: LocalReadinessData): { title: string; body: string }[] {
  const actions: { title: string; body: string }[] = [];

  if (data.metrics_score < 70) {
    actions.push({
      title: "Improve your Metrics & Traction score",
      body: "This is the highest-weight factor (35%). Focus on growing MRR, reducing churn, and improving your LTV:CAC ratio. Document your growth rate clearly with month-over-month data.",
    });
  }

  if (data.qa_score < 70) {
    actions.push({
      title: "Prepare answers to investor Q&A",
      body: "Q&A represents 25% of your score. Practice the 50+ most common investor questions. Every weak answer is a deal risk — especially around unit economics, TAM, and team.",
    });
  }

  if (data.valuation_score < 50) {
    actions.push({
      title: "Establish your valuation narrative",
      body: "Complete the Valuation Calculator with real inputs. Investors expect you to know your numbers and defend your valuation with comparable benchmarks and growth assumptions.",
    });
  }

  if (data.dataroom_score < 60) {
    actions.push({
      title: "Build a complete data room",
      body: "Investors will request financial statements, cap table, pitch deck, legal docs, and KPI dashboards during due diligence. Having these ready signals professionalism and speeds up closing.",
    });
  }

  if (data.runway > 0 && data.runway < 18) {
    actions.push({
      title: "Extend your runway before raising",
      body: "With less than 18 months of runway, you risk negotiating under pressure. Explore bridge financing, reduce burn, or accelerate revenue to reach a stronger position before raising.",
    });
  }

  if (!actions.length) {
    actions.push({
      title: "Maintain your strong position",
      body: "Your scores are solid. Focus on keeping your metrics up-to-date, rehearsing your pitch, and ensuring your data room is complete before your next investor meeting.",
    });
  }

  return actions.slice(0, 5);
}
