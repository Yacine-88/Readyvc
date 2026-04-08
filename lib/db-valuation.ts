import { createClient } from './supabase-client'

export interface ValuationData {
  id?: string
  user_id?: string
  name: string
  current_revenue: number
  growth_rate: number
  revenue_multiple: number
  estimated_valuation?: number
  valuation_low?: number
  valuation_high?: number
  stage?: string
  calculated_at?: string
}

export async function saveValuation(data: ValuationData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data: result, error } = await supabase
    .from('valuations')
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

export async function getValuation(name?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  let query = supabase
    .from('valuations')
    .select('*')
    .eq('user_id', user.id)

  if (name) {
    query = query.eq('name', name)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deleteValuation(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('valuations')
    .delete()
    .eq('id', id)

  if (error) throw error
}
