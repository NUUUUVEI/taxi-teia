import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { MAX_LUGGAGE, MAX_PASSENGERS } from '@/lib/types'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { checkAvailability } from '@/lib/server/availability'

/** Requests allowed from one IP per hour. */
const MAX_PER_IP_PER_HOUR = 5
/** Circuit breaker against a spam wave from many IPs at once. */
const MAX_TOTAL_PER_HOUR = 30

const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trimmed string within the limit, or null if missing, wrong type or too long. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : null
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || 'unknown'
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('Booking rejected: SUPABASE_SERVICE_ROLE_KEY is not configured')
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Honeypot: a field people never see, so only bots fill it in. Pretend it
  // worked so they have no reason to adapt.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true })
  }

  const client_name = text(body.client_name, 100)
  const client_phone = text(body.client_phone, 30)
  const client_email = body.client_email ? text(body.client_email, 254) : null
  const pickup_address = text(body.pickup_address, 300)
  const dropoff_address = text(body.dropoff_address, 300)
  const notes = body.notes ? text(body.notes, 1000) : null
  const start = new Date(String(body.start_time))
  const requested = body.requested_time ? new Date(String(body.requested_time)) : start

  if (
    !client_name || !client_phone || !pickup_address || !dropoff_address ||
    Number.isNaN(start.getTime()) || Number.isNaN(requested.getTime()) ||
    (body.client_email && (!client_email || !EMAIL_RE.test(client_email))) ||
    (body.notes && !notes)
  ) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  if (!PHONE_RE.test(client_phone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const ipHash = createHash('sha256')
    .update(`${clientIp(req)}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    .digest('hex')

  const [perIp, total] = await Promise.all([
    supabase
      .from('booking_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', hourAgo),
    supabase
      .from('booking_attempts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', hourAgo),
  ])

  if ((perIp.count ?? 0) >= MAX_PER_IP_PER_HOUR || (total.count ?? 0) >= MAX_TOTAL_PER_HOUR) {
    return NextResponse.json({ error: 'too_many' }, { status: 429 })
  }

  await supabase.from('booking_attempts').insert({ ip_hash: ipHash })
  // Nothing needs attempts older than a day.
  await supabase
    .from('booking_attempts')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // ── Availability ────────────────────────────────────────────────────────────
  // The form checks this too, but the browser can be bypassed.
  const estimated_minutes = clamp(body.estimated_minutes, 1, 600, 30)
  const availability = await checkAvailability({
    pickup: pickup_address,
    dropoff: dropoff_address,
    start,
    durationMinutes: estimated_minutes,
  })

  if (availability.status === 'blocked') {
    return NextResponse.json({ error: 'unavailable', availability }, { status: 409 })
  }

  const locale = typeof body.locale === 'string' && ['ca', 'es', 'en'].includes(body.locale)
    ? body.locale
    : 'ca'
  const flight_number = typeof body.flight_number === 'string' && body.flight_number.trim()
    ? body.flight_number.trim().slice(0, 12)
    : null

  const { error: insertError } = await supabase.from('bookings').insert({
    client_name,
    client_phone,
    client_email,
    pickup_address,
    dropoff_address,
    service_type: 'local',
    start_time: start.toISOString(),
    requested_time: requested.toISOString(),
    time_mode: body.time_mode === 'arrival' ? 'arrival' : 'pickup',
    locale,
    estimated_minutes,
    notes,
    flight_number,
    passengers: clamp(body.passengers, 1, MAX_PASSENGERS, 1),
    luggage: clamp(body.luggage, 0, MAX_LUGGAGE, 0),
    status: 'pending',
  })

  if (insertError) {
    console.error('Supabase insert error:', insertError)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
