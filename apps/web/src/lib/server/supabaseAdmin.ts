import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

/**
 * SERVER ONLY. The service role key bypasses row level security, which is how
 * the website reads bookings and the driver's position without exposing either
 * to the browser. Never import this from a client component.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  // next.config.mjs falls back to .env.example, whose placeholders say "your-".
  if (!url || !key || url.includes('your-') || key.includes('your-')) return null
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
