import { createClient } from './supabase-client'

export interface QAAssessmentData {
  id?: string
  user_id?: string
  name: string
  total_score: number
  max_score?: number
  category_scores: Record<string, number>
  responses: Record<string, any>
  perspective?: 'founder' | 'investor'
  calculated_at?: string
}

export async function saveQAAssessment(data: QAAssessmentData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Silently skip saving if user is not authenticated
  if (!user) {
    console.log("[v0] Q&A assessment not saved - user not authenticated")
    return null
  }

  const { data: result, error } = await supabase
    .from('qa_assessments')
    .upsert({
      ...data,
      user_id: user.id,
      max_score: 100,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,name,perspective' })
    .select()

  if (error) throw error
  return result?.[0]
}

export async function getQAAssessment(name?: string, perspective?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Return empty array if user is not authenticated
  if (!user) {
    console.log("[v0] Q&A assessment not retrieved - user not authenticated")
    return []
  }

  let query = supabase
    .from('qa_assessments')
    .select('*')
    .eq('user_id', user.id)

  if (name) {
    query = query.eq('name', name)
  }
  
  if (perspective) {
    query = query.eq('perspective', perspective)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deleteQAAssessment(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('qa_assessments')
    .delete()
    .eq('id', id)

  if (error) throw error
}
