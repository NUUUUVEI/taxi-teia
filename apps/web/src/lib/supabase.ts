import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

function readEnv(key: string): string {
  const value = process.env[key]?.trim() ?? ''
  if (!value || value.includes('your-') || value.includes('your_')) return ''
  return value
}

export function getSupabase(): SupabaseClient<Database> | null {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !key) return null
  return createClient<Database>(url, key)
}

export const supabase = getSupabase()
