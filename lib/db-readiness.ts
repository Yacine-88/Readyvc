import { createClient } from './supabase-client'

export interface ReadinessScoreData {
  id?: string
  user_id?: string
  overall_score: number
  metrics_score?: number
  valuation_score?: number
  qa_score?: number
  cap_table_score?: number
  pitch_score?: number
  dataroom_score?: number
  investor_readiness_percentage?: number
  calculated_at?: string
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

export async function getReadinessScore() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('readiness_scores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine for first time
    throw error
  }
  
  return data || null
}
