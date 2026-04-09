import { createClient } from './supabase-client'

export interface PitchData {
  id?: string
  user_id?: string
  name: string
  problem_score: number
  solution_score: number
  market_score: number
  team_score: number
  traction_score: number
  overall_score: number
  feedback: Record<string, any>
  calculated_at?: string
}

export async function savePitch(data: PitchData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Silently skip saving if user is not authenticated
  if (!user) {
    console.log("[v0] Pitch not saved - user not authenticated")
    return null
  }

  const { data: result, error } = await supabase
    .from('pitches')
    .upsert({
      ...data,
      user_id: user.id,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,name' })
    .select()

  if (error) throw error
  return result?.[0]
}

export async function getPitch(name?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Return empty array if user is not authenticated
  if (!user) {
    console.log("[v0] Pitch not retrieved - user not authenticated")
    return []
  }

  let query = supabase
    .from('pitches')
    .select('*')
    .eq('user_id', user.id)

  if (name) {
    query = query.eq('name', name)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deletePitch(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('pitches')
    .delete()
    .eq('id', id)

  if (error) throw error
}
