import { createClient } from './supabase-client'

export interface MetricsData {
  id?: string
  user_id?: string
  name: string
  monthly_revenue: number
  monthly_growth_rate: number
  customer_acquisition_cost: number
  lifetime_value: number
  monthly_churn_rate: number
  magic_number?: number
  payback_period?: number
  rule_of_40_score?: number
  calculated_at?: string
}

export async function saveMetrics(data: MetricsData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Silently skip saving if user is not authenticated
  if (!user) {
    console.log("[v0] Metrics not saved - user not authenticated")
    return null
  }

  const { data: result, error } = await supabase
    .from('metrics')
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

export async function getMetrics(name?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Return empty array if user is not authenticated
  if (!user) {
    console.log("[v0] Metrics not retrieved - user not authenticated")
    return []
  }

  let query = supabase
    .from('metrics')
    .select('*')
    .eq('user_id', user.id)

  if (name) {
    query = query.eq('name', name)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deleteMetrics(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('metrics')
    .delete()
    .eq('id', id)

  if (error) throw error
}
