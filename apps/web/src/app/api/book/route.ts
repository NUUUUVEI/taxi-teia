import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MAX_LUGGAGE, MAX_PASSENGERS } from '@/lib/types'

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
    flight_number,
    passengers,
    luggage,
  } = body

  if (!client_name || !client_phone || !pickup_address || !dropoff_address || !start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const clamp = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, Math.round(parsed)))
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
    flight_number: typeof flight_number === 'string' && flight_number.trim()
      ? flight_number.trim().slice(0, 12)
      : null,
    passengers: clamp(passengers, 1, MAX_PASSENGERS, 1),
    luggage: clamp(luggage, 0, MAX_LUGGAGE, 0),
    status: 'pending',
  })

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
