/**
 * Client-side readiness engine — reads tool scores from localStorage.
 * Works without Supabase auth. Each tool page writes its score on save.
 *
 * Weights (must sum to 1.0):
 *   Metrics:   35%
 *   Q&A:       25%
 *   Valuation: 20%
 *   Cap Table: 10%
 *   Pitch:      5%
 *   Data Room:  5%
 */

export interface LocalReadinessData {
  overall_score: number
  metrics_score: number
  valuation_score: number
  qa_score: number
  cap_table_score: number
  pitch_score: number
  dataroom_score: number
  // Raw metrics for Dashboard display
  mrr: number
  arr: number
  growth_rate: number
  ltv_cac: number
  runway: number
  estimated_valuation: number
  sector: string
  stage: string
}

const W = {
  metrics:   0.35,
  qa:        0.25,
  valuation: 0.20,
  captable:  0.10,
  pitch:     0.05,
  dataroom:  0.05,
} as const

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function clamp(v: number): number {
  return isNaN(v) ? 0 : Math.min(100, Math.max(0, Math.round(v)))
}

// ─── Per-tool score storage schemas ──────────────────────────────────────────

interface MetricsLocal {
  score: number
  mrr: number
  arr: number
  growth_rate: number
  ltv_cac: number
  churn: number
  runway: number
}

interface ValuationLocal {
  score: number
  estimated_valuation: number
  growth_rate: number
  sector: string
  stage: string
}

interface QALocal {
  score: number
}

interface CapTableLocal {
  score: number
}

interface PitchSave {
  overallScore: number
  answers: Record<string, number>
  timestamp: string
}

interface DataroomResults {
  readinessScore: number
  completionRate: number
  complete: number
  total: number
}

// ─── Score helpers (used by tool pages to persist their score) ────────────────

/**
 * Compute metrics readiness score (0–100).
 * Breakdown: MRR (30pts) + Growth (30pts) + LTV:CAC (25pts) + Churn (15pts) = 100
 */
export function computeMetricsScore(
  mrr: number,
  growthPct: number,
  ltvCac: number,
  churnPct: number
): number {
  let s = 0
  // MRR
  if (mrr >= 50_000) s += 30
  else if (mrr >= 20_000) s += 24
  else if (mrr >= 5_000) s += 18
  else if (mrr > 0) s += 10
  // Growth
  if (growthPct >= 30) s += 30
  else if (growthPct >= 15) s += 22
  else if (growthPct >= 5) s += 15
  else if (growthPct > 0) s += 8
  // LTV:CAC
  if (ltvCac >= 5) s += 25
  else if (ltvCac >= 3) s += 20
  else if (ltvCac >= 1.5) s += 12
  // Churn
  if (churnPct <= 3) s += 15
  else if (churnPct <= 7) s += 8
  return clamp(s)
}

/**
 * Compute valuation readiness score (0–100).
 * Breakdown: has valuation (50pts) + growth rate band (30pts) + sector/stage (20pts)
 */
export function computeValuationScore(
  estimatedValuation: number,
  growthPct: number,
  hasSector: boolean
): number {
  let s = 0
  if (estimatedValuation > 0) s += 50
  if (growthPct >= 60) s += 30
  else if (growthPct >= 30) s += 22
  else if (growthPct >= 15) s += 14
  else if (growthPct > 0) s += 8
  if (hasSector) s += 20
  return clamp(s)
}

/**
 * Compute cap table readiness score (0–100).
 * Breakdown: has table (30pts) + founder control (30pts) + ESOP (20pts) + investors (20pts)
 */
export function computeCapTableScore(
  founderPercentage: number,
  hasEsop: boolean,
  hasInvestors: boolean
): number {
  let s = 30
  if (founderPercentage > 50) s += 30
  else if (founderPercentage > 0) s += 10
  if (hasEsop) s += 20
  if (hasInvestors) s += 20
  return clamp(s)
}

// ─── Main reader ─────────────────────────────────────────────────────────────

export function getLocalReadinessScore(): LocalReadinessData {
  const m = safeRead<MetricsLocal>("vcready_metrics", {
    score: 0, mrr: 0, arr: 0, growth_rate: 0, ltv_cac: 0, churn: 0, runway: 0,
  })
  const v = safeRead<ValuationLocal>("vcready_valuation", {
    score: 0, estimated_valuation: 0, growth_rate: 0, sector: "", stage: "",
  })
  const qa = safeRead<QALocal>("vcready_qa", { score: 0 })
  const ct = safeRead<CapTableLocal>("vcready_captable", { score: 0 })
  const pitchSaves = safeRead<PitchSave[]>("vcready_pitch", [])
  const dr = safeRead<DataroomResults>("dataroom_results", {
    readinessScore: 0, completionRate: 0, complete: 0, total: 0,
  })

  const metrics_score   = clamp(m.score)
  const valuation_score = clamp(v.score)
  const qa_score        = clamp(qa.score)
  const cap_table_score = clamp(ct.score)
  const pitch_score     = pitchSaves.length
    ? clamp(pitchSaves[pitchSaves.length - 1].overallScore ?? 0)
    : 0
  const dataroom_score  = clamp(dr.readinessScore)

  const overall_score = clamp(
    metrics_score   * W.metrics   +
    qa_score        * W.qa        +
    valuation_score * W.valuation +
    cap_table_score * W.captable  +
    pitch_score     * W.pitch     +
    dataroom_score  * W.dataroom
  )

  return {
    overall_score,
    metrics_score,
    valuation_score,
    qa_score,
    cap_table_score,
    pitch_score,
    dataroom_score,
    mrr: m.mrr,
    arr: m.arr,
    growth_rate: m.growth_rate,
    ltv_cac: m.ltv_cac,
    runway: m.runway,
    estimated_valuation: v.estimated_valuation,
    sector: v.sector,
    stage: v.stage,
  }
}

// ─── Readiness History ────────────────────────────────────────────────────────

export interface ReadinessSnapshot {
  timestamp: string
  overall_score: number
  metrics_score: number
  valuation_score: number
  qa_score: number
  cap_table_score: number
  pitch_score: number
  dataroom_score: number
}

const HISTORY_KEY = "vcready_history"
const MAX_HISTORY = 20

export function saveReadinessSnapshot(): void {
  if (typeof window === "undefined") return
  const current = getLocalReadinessScore()
  if (current.overall_score === 0) return // don't record empty state

  const snapshot: ReadinessSnapshot = {
    timestamp: new Date().toISOString(),
    overall_score: current.overall_score,
    metrics_score: current.metrics_score,
    valuation_score: current.valuation_score,
    qa_score: current.qa_score,
    cap_table_score: current.cap_table_score,
    pitch_score: current.pitch_score,
    dataroom_score: current.dataroom_score,
  }

  const history = getReadinessHistory()
  // Avoid duplicate entries within 60 seconds
  const last = history[history.length - 1]
  if (last && Math.abs(new Date(last.timestamp).getTime() - Date.now()) < 60_000) {
    history[history.length - 1] = snapshot // replace with latest
  } else {
    history.push(snapshot)
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)))
}

export function getReadinessHistory(): ReadinessSnapshot[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as ReadinessSnapshot[]) : []
  } catch {
    return []
  }
}
