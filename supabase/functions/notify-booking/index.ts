import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { clientEmail, emailForUpdate, esc, formatDate, formatShort, type Booking } from './emails.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Resend only sends from reservas@taxiteia.com once the domain is verified.
// Until then, or when testing, set EMAIL_FROM to 'Taxi Teià <onboarding@resend.dev>'
// and EMAIL_OVERRIDE_TO to the Resend account's own address: Resend's test
// sender only delivers there, and no real client gets a test email.
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') || 'Taxi Teià <reservas@taxiteia.com>'
const DRIVER_EMAIL = Deno.env.get('DRIVER_EMAIL') || 'marctaxiteia@gmail.com'
const EMAIL_OVERRIDE_TO = Deno.env.get('EMAIL_OVERRIDE_TO') ?? ''

interface BookingPayload {
  type: 'INSERT' | 'UPDATE'
  record: Booking
  /** The whole previous row; database webhooks send it on UPDATE. */
  old_record?: Booking
}

async function sendEmail(intendedTo: string, subject: string, html: string) {
  const to = EMAIL_OVERRIDE_TO || intendedTo
  if (EMAIL_OVERRIDE_TO) subject = `[TEST → ${intendedTo}] ${subject}`
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, email skipped:', to, subject)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) console.error('Resend error', res.status, await res.text())
}

async function sendPushToDriver(title: string, body: string, bookingId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: tokens } = await db.from('driver_push_tokens').select('token')
  if (!tokens?.length) {
    console.warn('No driver push tokens registered')
    return
  }

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    // The app creates this channel with max importance, so the notification
    // pops up and rings even with the phone in a pocket.
    channelId: 'bookings',
    priority: 'high',
    data: { type: 'new_booking', bookingId },
  }))

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) console.error('Expo push error', res.status, await res.text())
}

async function notifyDriverOfNewBooking(b: Booking) {
  const pax = b.passengers ?? 1
  const bags = b.luggage ?? 0
  const paxLine = `${pax} pax${bags > 0 ? ` · ${bags} maletes` : ''}`

  await sendPushToDriver(
    `Nova reserva — ${b.client_name}`,
    [
      `${formatShort(b.start_time, 'ca')} · ${b.pickup_address}`,
      paxLine,
      b.flight_number ? `Vol ${b.flight_number}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    b.id
  )

  await sendEmail(
    DRIVER_EMAIL,
    `Nova reserva de ${b.client_name}`,
    `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#FBF6EC;color:#1F1B16;border-radius:12px;overflow:hidden;border:1px solid #DED2BA">
      <div style="background:#FFC72C;padding:14px 32px;font-weight:bold;font-size:16px">Taxi Teià</div>
      <div style="padding:32px">
      <h2 style="margin:0 0 4px">Nova reserva</h2>
      <p style="color:#5C5346;font-size:14px;margin-top:0">Sistema de reserves</p>
      <hr style="border:0;border-top:1px solid #DED2BA;margin:24px 0"/>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#5C5346;width:140px">Client</td><td style="color:#1F1B16"><strong>${esc(b.client_name)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#5C5346">Telèfon</td><td style="color:#1F1B16">${esc(b.client_phone)}</td></tr>
        ${b.client_email ? `<tr><td style="padding:8px 0;color:#5C5346">Email</td><td style="color:#1F1B16">${esc(b.client_email)}</td></tr>` : `<tr><td style="padding:8px 0;color:#5C5346">Email</td><td style="color:#B42318">Sense correu: avisa'l per telèfon si canvies res</td></tr>`}
        <tr><td style="padding:8px 0;color:#5C5346">Recollida</td><td style="color:#8A5A00"><strong>${formatDate(b.start_time, 'ca')}</strong></td></tr>
        ${b.time_mode === 'arrival' && b.requested_time ? `<tr><td style="padding:8px 0;color:#5C5346">Arribada sol·licitada</td><td style="color:#1F1B16">${formatDate(b.requested_time, 'ca')}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#5C5346">Origen</td><td style="color:#1F1B16">${esc(b.pickup_address)}</td></tr>
        <tr><td style="padding:8px 0;color:#5C5346">Destí</td><td style="color:#1F1B16">${esc(b.dropoff_address)}</td></tr>
        <tr><td style="padding:8px 0;color:#5C5346">Passatgers</td><td style="color:#1F1B16">${esc(pax)}</td></tr>
        <tr><td style="padding:8px 0;color:#5C5346">Maletes</td><td style="color:#1F1B16">${esc(bags)}</td></tr>
        ${b.flight_number ? `<tr><td style="padding:8px 0;color:#5C5346">Vol</td><td style="color:#8A5A00"><strong>${esc(b.flight_number)}</strong></td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#5C5346">Temps estimat</td><td style="color:#1F1B16">${esc(b.estimated_minutes)} min</td></tr>
        ${b.notes ? `<tr><td style="padding:8px 0;color:#5C5346">Notes</td><td style="color:#1F1B16">${esc(b.notes)}</td></tr>` : ''}
      </table>
      <hr style="border:0;border-top:1px solid #DED2BA;margin:24px 0"/>
      <p style="font-size:12px;color:#5C5346">Obre l'app per confirmar, canviar l'hora o rebutjar el viatge.</p>
      </div>
    </div>
    `
  )
}

/** Compares secrets without leaking how many leading characters matched. */
function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Only the database webhook may call this: anyone else could otherwise push
 * fake bookings to the driver's phone or send emails in Taxi Teià's name.
 * The webhook proves itself with the service role key (the default for
 * Supabase webhooks that target an Edge Function) or with WEBHOOK_SECRET in an
 * x-webhook-secret header.
 */
function isAuthorised(req: Request) {
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const secret = req.headers.get('x-webhook-secret') ?? ''
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? ''
  return safeEqual(bearer, SUPABASE_SERVICE_KEY) || safeEqual(secret, webhookSecret)
}

serve(async (req) => {
  if (!isAuthorised(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload: BookingPayload = await req.json()
  const b = payload.record

  if (payload.type === 'INSERT') {
    await notifyDriverOfNewBooking(b)
    if (b.client_email) {
      const { subject, html } = clientEmail('received', b)
      await sendEmail(b.client_email, subject, html)
    }
  }

  if (payload.type === 'UPDATE' && b.client_email) {
    const email = emailForUpdate(b, payload.old_record)
    if (email) {
      const { subject, html } = clientEmail(email.kind, b, email.previousStart)
      await sendEmail(b.client_email, subject, html)
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
