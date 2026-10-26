import { supabase } from './supabase'

const BUCKET = 'expense-invoices'
/** Long enough to look at an invoice, short enough that a leaked link dies. */
const SIGNED_URL_SECONDS = 60 * 60

/**
 * expenses.invoice_photo_url holds the object path inside the private bucket.
 * Rows saved before the bucket went private held a full public URL instead.
 */
function objectPath(stored: string) {
  return stored.replace(/^.*\/expense-invoices\//, '')
}

export async function signedInvoiceUrl(stored: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPath(stored), SIGNED_URL_SECONDS)
  if (error) return null
  return data.signedUrl
}
