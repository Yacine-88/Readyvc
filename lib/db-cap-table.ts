import { createClient } from './supabase-client'

export interface CapTableData {
  id?: string
  user_id?: string
  name: string
  total_shares: number
  founders_shares: number
  series_a_shares: number
  series_a_valuation: number
  series_a_price_per_share: number
  fully_diluted_shares: number
  option_pool_percentage: number
  details: Record<string, any>
  calculated_at?: string
}

export async function saveCapTable(data: CapTableData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Silently skip saving if user is not authenticated
  if (!user) {
    console.log("[v0] Cap table not saved - user not authenticated")
    return null
  }

  const { data: result, error } = await supabase
    .from('cap_tables')
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

export async function getCapTable(name?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Return empty array if user is not authenticated
  if (!user) {
    console.log("[v0] Cap table not retrieved - user not authenticated")
    return []
  }

  let query = supabase
    .from('cap_tables')
    .select('*')
    .eq('user_id', user.id)

  if (name) {
    query = query.eq('name', name)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deleteCapTable(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('cap_tables')
    .delete()
    .eq('id', id)

  if (error) throw error
}
