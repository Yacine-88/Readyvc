import { createClient } from './supabase-client'

export interface DataroomDocumentData {
  id?: string
  user_id?: string
  dataroom_name: string
  document_name: string
  category: string
  file_path?: string
  analysis: Record<string, any>
  completeness_score: number
}

export async function saveDataroomDocument(data: DataroomDocumentData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { data: result, error } = await supabase
    .from('dataroom_documents')
    .upsert({
      ...data,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,dataroom_name,document_name' })
    .select()

  if (error) throw error
  return result?.[0]
}

export async function getDataroomDocuments(dataroom_name?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  let query = supabase
    .from('dataroom_documents')
    .select('*')
    .eq('user_id', user.id)

  if (dataroom_name) {
    query = query.eq('dataroom_name', dataroom_name)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function deleteDataroomDocument(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('dataroom_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
