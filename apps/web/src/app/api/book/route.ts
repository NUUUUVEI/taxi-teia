import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(url, key)

  const body = await req.json()
  const {
    client_name,
    client_phone,
    client_email,
    pickup_address,
    dropoff_address,
    start_time,
    requested_time,
    time_mode,
    locale,
    estimated_minutes,
    notes,
  } = body

  if (!client_name || !client_phone || !pickup_address || !dropoff_address || !start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('bookings').insert({
    client_name,
    client_phone,
    client_email: client_email || null,
    pickup_address,
    dropoff_address,
    service_type: 'local',
    start_time,
    requested_time: requested_time || start_time,
    time_mode: time_mode === 'arrival' ? 'arrival' : 'pickup',
    locale: ['ca', 'es', 'en'].includes(locale) ? locale : 'ca',
    estimated_minutes: estimated_minutes ?? 30,
    notes: notes || null,
    status: 'pending',
  })

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
