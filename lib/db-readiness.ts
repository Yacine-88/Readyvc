import { createClient } from './supabase-client'
import { getMetrics } from './db-metrics'
import { getValuation } from './db-valuation'
import { getQAAssessment } from './db-qa'
import { getCapTable } from './db-cap-table'
import { getPitch } from './db-pitch'
import { getDataroomDocuments } from './db-dataroom'

export interface ReadinessScoreData {
  id?: string
  user_id?: string
  overall_score: number
  metrics_score: number
  valuation_score: number
  qa_score: number
  cap_table_score: number
  pitch_score: number
  dataroom_score: number
  investor_readiness_percentage: number
  calculated_at?: string
}

/**
 * Calculate readiness score from metrics
 * Based on: MRR, growth rate, LTV:CAC ratio, churn rate
 */
function calculateMetricsScore(metrics: any): number {
  if (!metrics) return 0;
  
  let score = 50;
  const mrr = metrics.monthly_revenue || 0;
  const growth = metrics.monthly_growth_rate || 0;
  const ltvCac = (metrics.lifetime_value || 0) / (metrics.customer_acquisition_cost || 1);
  const churn = metrics.monthly_churn_rate || 0;

  // MRR component (25 points)
  if (mrr >= 50000) score += 25;
  else if (mrr >= 20000) score += 20;
  else if (mrr >= 5000) score += 15;
  else if (mrr > 0) score += 10;

  // Growth rate component (25 points)
  if (growth >= 30) score += 25;
  else if (growth >= 15) score += 20;
  else if (growth >= 5) score += 15;
  else if (growth > 0) score += 10;

  // LTV:CAC component (15 points)
  if (ltvCac >= 5) score += 15;
  else if (ltvCac >= 3) score += 12;
  else if (ltvCac >= 1.5) score += 8;

  // Churn component (10 points)
  if (churn <= 3) score += 10;
  else if (churn <= 7) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate readiness score from valuation
 * Based on: having completed valuation analysis
 */
function calculateValuationScore(valuation: any): number {
  if (!valuation) return 0;
  // Score based on valuation completion and reasonableness
  let score = 50;
  
  if (valuation.estimated_valuation && valuation.estimated_valuation > 0) score += 30;
  if (valuation.growth_rate && valuation.growth_rate > 0) score += 20;
  
  return Math.min(100, score);
}

/**
 * Calculate readiness score from Q&A assessments
 * Based on: overall assessment score
 */
function calculateQAScore(assessments: any[]): number {
  if (!assessments || assessments.length === 0) return 0;
  
  // Prefer investor perspective for readiness scoring
  const investorPerspective = assessments.find(a => a.perspective === 'investor');
  const assessment = investorPerspective || assessments[0];
  
  return assessment?.total_score || 0;
}

/**
 * Calculate readiness score from cap table
 * Based on: completeness of cap table
 */
function calculateCapTableScore(capTables: any[]): number {
  if (!capTables || capTables.length === 0) return 0;
  
  const table = capTables[0];
  let score = 50;
  
  if (table.founders_shares > 0) score += 15;
  if (table.series_a_shares > 0) score += 20;
  if (table.option_pool_percentage > 0) score += 15;
  
  return Math.min(100, score);
}

/**
 * Calculate readiness score from pitch
 * Based on: pitch quality score
 */
function calculatePitchScore(pitches: any[]): number {
  if (!pitches || pitches.length === 0) return 0;
  
  const pitch = pitches[0];
  return pitch?.overall_score || 0;
}

/**
 * Calculate readiness score from data room
 * Based on: document completeness and diversity
 */
function calculateDataroomScore(documents: any[]): number {
  if (!documents || documents.length === 0) return 20;
  
  let score = 50;
  const uniqueCategories = new Set(documents.map(d => d.category)).size;
  
  // Bonus for diverse document types
  score += Math.min(30, uniqueCategories * 5);
  
  // Average completeness score
  const avgCompleteness = documents.reduce((sum, d) => sum + (d.completeness_score || 0), 0) / documents.length;
  score += avgCompleteness * 0.2;
  
  return Math.min(100, score);
}

/**
 * Calculate overall investor readiness score (0-100)
 * Gracefully handles unauthenticated users by returning zero scores
 */
export async function calculateReadinessScore(): Promise<ReadinessScoreData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Return default scores if user is not authenticated
  if (!user) {
    console.log("[v0] Readiness score not calculated - user not authenticated")
    return {
      overall_score: 0,
      metrics_score: 0,
      valuation_score: 0,
      qa_score: 0,
      cap_table_score: 0,
      pitch_score: 0,
      dataroom_score: 0,
      investor_readiness_percentage: 0,
    }
  }

  // Fetch latest data from each tool
  const [metricsData, valuationData, qaData, capTableData, pitchData, dataroomData] = await Promise.all([
    getMetrics(),
    getValuation(),
    getQAAssessment(),
    getCapTable(),
    getPitch(),
    getDataroomDocuments(),
  ]).catch(() => [null, null, null, null, null, null]);

  // Calculate individual scores
  const metrics_score = calculateMetricsScore(metricsData?.[0]);
  const valuation_score = calculateValuationScore(valuationData?.[0]);
  const qa_score = calculateQAScore(qaData ?? []);
  const cap_table_score = calculateCapTableScore(capTableData ?? []);
  const pitch_score = calculatePitchScore(pitchData ?? []);
  const dataroom_score = calculateDataroomScore(dataroomData ?? []);

  // Overall readiness: weighted average (MUST total 100%)
  // Metrics & Traction: 35% (most critical - revenue, growth, unit economics)
  // Q&A Prep: 25% (critical - investor confidence in founder)
  // Valuation: 20% (important - financial model credibility)
  // Cap Table: 10% (moderate - ownership structure)
  // Pitch: 5% (supplementary - messaging clarity)
  // Data Room: 5% (supplementary - supporting documentation)
  // TOTAL WEIGHT = 35 + 25 + 20 + 10 + 5 + 5 = 100%
  
  // Calculate weighted score with explicit bounds verification
  const weighted_sum = (
    (metrics_score * 0.35) +
    (qa_score * 0.25) +
    (valuation_score * 0.2) +
    (cap_table_score * 0.1) +
    (pitch_score * 0.05) +
    (dataroom_score * 0.05)
  );
  
  // Verify normalization: since each input score is 0-100 and weights sum to 1.0,
  // the output should be bounded: 0 <= weighted_sum <= 100
  const overall_score = Math.min(100, Math.max(0, Math.round(weighted_sum)));

  const investor_readiness_percentage = overall_score;

  return {
    overall_score,
    metrics_score,
    valuation_score,
    qa_score,
    cap_table_score,
    pitch_score,
    dataroom_score,
    investor_readiness_percentage,
  };
}

export async function getReadinessScore() {
  try {
    return await calculateReadinessScore();
  } catch (error) {
    console.error("[v0] Error calculating readiness score:", error);
    // Return default zero scores if calculation fails
    return {
      overall_score: 0,
      metrics_score: 0,
      valuation_score: 0,
      qa_score: 0,
      cap_table_score: 0,
      pitch_score: 0,
      dataroom_score: 0,
      investor_readiness_percentage: 0,
    };
  }
}

export async function saveReadinessScore(data: ReadinessScoreData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data: result, error } = await supabase
    .from('readiness_scores')
    .upsert({
      ...data,
      user_id: user.id,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()

  if (error) throw error
  return result?.[0]
}
