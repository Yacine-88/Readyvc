import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Stub client returned when Supabase env vars are not configured.
// All auth calls resolve with no user so callers degrade gracefully.
const stubClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    upsert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
} as any

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return stubClient
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
