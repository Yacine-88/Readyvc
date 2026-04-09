import { createClient } from './supabase-client'

export interface ValuationData {
  id?: string
  user_id?: string
  name: string
  // Inputs
  current_revenue: number
  growth_rate: number
  sector?: string
  stage?: string
  investment_amount?: number
  investor_equity?: number
  target_irr?: number
  exit_years?: number
  exit_revenue_multiple?: number
  // Results
  revenue_multiple: number
  estimated_valuation?: number
  valuation_low?: number
  valuation_high?: number
  vc_method_valuation?: number
  comparables_valuation?: number
  blended_low?: number
  blended_base?: number
  blended_high?: number
  // Investor mechanics
  pre_money?: number
  post_money?: number
  investor_equity_at_exit?: number
  exit_proceeds?: number
  cash_on_cash?: number
  implied_irr?: number
  // Meta
  calculated_at?: string
}

export async function saveValuation(data: ValuationData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] Valuation not saved - user not authenticated")
    return null
  }

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

  if (!user) {
    console.log("[v0] Valuation not retrieved - user not authenticated")
    return []
  }

  let query = supabase
    .from('valuations')
    .select('*')
    .eq('user_id', user.id)
    .order('calculated_at', { ascending: false })

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
