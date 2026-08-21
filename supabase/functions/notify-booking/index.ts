import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL = 'Taxi Teià <reservas@taxiteia.com>'
const DRIVER_EMAIL = 'marctaxiteia@gmail.com'

const EMAIL_LOCALES: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-GB',
}

interface BookingPayload {
  type: 'INSERT' | 'UPDATE'
  record: {
    id: string
    client_name: string
    client_email: string | null
    client_phone: string
    pickup_address: string
    dropoff_address: string
    start_time: string
    requested_time: string | null
    time_mode: string | null
    locale: string | null
    estimated_minutes: number
    status: string
    notes: string | null
    flight_number: string | null
    passengers: number | null
    luggage: number | null
  }
  old_record?: { status: string }
}

/** These emails interpolate text typed into a public form, so escape it. */
function esc(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
}

function formatDate(iso: string, locale = 'ca') {
  const tag = EMAIL_LOCALES[locale] ?? 'ca-ES'
  return new Date(iso).toLocaleString(tag, {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatShort(iso: string, locale = 'ca') {
  const tag = EMAIL_LOCALES[locale] ?? 'ca-ES'
  return new Date(iso).toLocaleString(tag, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

async function sendPushToDriver(title: string, body: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: tokens } = await db.from('driver_push_tokens').select('token')
  if (!tokens?.length) return

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: { type: 'new_booking' },
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  })
}

serve(async (req) => {
  const payload: BookingPayload = await req.json()
  const b = payload.record
  const loc = b.locale ?? 'ca'

  const pax = b.passengers ?? 1
  const bags = b.luggage ?? 0
  const paxLine = `${pax} pax${bags > 0 ? ` · ${bags} maletes` : ''}`

  if (payload.type === 'INSERT') {
    await sendPushToDriver(
      `Nova reserva — ${b.client_name}`,
      [
        `${formatShort(b.start_time, 'ca')} · ${b.pickup_address}`,
        paxLine,
        b.flight_number ? `Vol ${b.flight_number}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    await sendEmail(
      DRIVER_EMAIL,
      `Nova reserva de ${b.client_name}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0a0a0a;color:#f5f5f5;padding:32px;border-radius:8px">
        <h2 style="color:#C9A84C;margin-bottom:4px">Nova reserva</h2>
        <p style="color:#a0a0a0;font-size:14px;margin-top:0">Taxi Teià · Sistema de reserves</p>
        <hr style="border-color:#2a2a2a;margin:24px 0"/>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#a0a0a0;width:140px">Client</td><td style="color:#f5f5f5"><strong>${esc(b.client_name)}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">Telèfon</td><td style="color:#f5f5f5">${esc(b.client_phone)}</td></tr>
          ${b.client_email ? `<tr><td style="padding:8px 0;color:#a0a0a0">Email</td><td style="color:#f5f5f5">${esc(b.client_email)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#a0a0a0">Recollida</td><td style="color:#C9A84C"><strong>${formatDate(b.start_time, 'ca')}</strong></td></tr>
          ${b.time_mode === 'arrival' && b.requested_time ? `<tr><td style="padding:8px 0;color:#a0a0a0">Arribada sol·licitada</td><td style="color:#f5f5f5">${formatDate(b.requested_time, 'ca')}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#a0a0a0">Origen</td><td style="color:#f5f5f5">${esc(b.pickup_address)}</td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">Destí</td><td style="color:#f5f5f5">${esc(b.dropoff_address)}</td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">Passatgers</td><td style="color:#f5f5f5">${esc(pax)}</td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">Maletes</td><td style="color:#f5f5f5">${esc(bags)}</td></tr>
          ${b.flight_number ? `<tr><td style="padding:8px 0;color:#a0a0a0">Vol</td><td style="color:#C9A84C"><strong>${esc(b.flight_number)}</strong></td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#a0a0a0">Temps estimat</td><td style="color:#f5f5f5">${esc(b.estimated_minutes)} min</td></tr>
          ${b.notes ? `<tr><td style="padding:8px 0;color:#a0a0a0">Notes</td><td style="color:#f5f5f5">${esc(b.notes)}</td></tr>` : ''}
        </table>
        <hr style="border-color:#2a2a2a;margin:24px 0"/>
        <p style="font-size:12px;color:#606060">Obre l'app per confirmar o rebutjar el viatge.</p>
      </div>
      `
    )
  }

  if (
    payload.type === 'UPDATE' &&
    payload.old_record?.status !== b.status &&
    b.client_email &&
    (b.status === 'confirmed' || b.status === 'cancelled')
  ) {
    const isConfirmed = b.status === 'confirmed'
    const labels = {
      ca: {
        confirmed: '✓ Reserva confirmada',
        cancelled: '✗ Reserva no disponible',
        dateTime: 'Data i hora de recollida',
        pickup: 'Recollida',
        dropoff: 'Destí',
        arrival: 'Arribada sol·licitada',
        passengers: 'Passatgers',
        luggage: 'Maletes',
        flight: 'Vol',
        change: 'Si necessites algun canvi, truca al',
        sorry: 'Ho sentim, el servei sol·licitat no està disponible en aquell horari. Contacta\'ns per trobar una alternativa.',
        subjectConfirmed: `Reserva confirmada — ${formatDate(b.start_time, loc)}`,
        subjectCancelled: 'Reserva no disponible — Taxi Teià',
      },
      es: {
        confirmed: '✓ Reserva confirmada',
        cancelled: '✗ Reserva no disponible',
        dateTime: 'Fecha y hora de recogida',
        pickup: 'Recogida',
        dropoff: 'Destino',
        arrival: 'Llegada solicitada',
        passengers: 'Pasajeros',
        luggage: 'Maletas',
        flight: 'Vuelo',
        change: 'Si necesitas algún cambio, llama al',
        sorry: 'Lo sentimos, el servicio solicitado no está disponible en ese horario. Contáctanos para encontrar una alternativa.',
        subjectConfirmed: `Reserva confirmada — ${formatDate(b.start_time, loc)}`,
        subjectCancelled: 'Reserva no disponible — Taxi Teià',
      },
      en: {
        confirmed: '✓ Booking confirmed',
        cancelled: '✗ Booking unavailable',
        dateTime: 'Pick-up date & time',
        pickup: 'Pick-up',
        dropoff: 'Drop-off',
        arrival: 'Requested arrival',
        passengers: 'Passengers',
        luggage: 'Suitcases',
        flight: 'Flight',
        change: 'If you need any changes, call',
        sorry: 'Sorry, the requested service is not available at that time. Please contact us to find an alternative.',
        subjectConfirmed: `Booking confirmed — ${formatDate(b.start_time, loc)}`,
        subjectCancelled: 'Booking unavailable — Taxi Teià',
      },
    }
    const L = labels[loc as keyof typeof labels] ?? labels.ca

    await sendEmail(
      b.client_email,
      isConfirmed ? L.subjectConfirmed : L.subjectCancelled,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0a0a0a;color:#f5f5f5;padding:32px;border-radius:8px">
        <h2 style="color:${isConfirmed ? '#22C55E' : '#EF4444'};margin-bottom:4px">
          ${isConfirmed ? L.confirmed : L.cancelled}
        </h2>
        <p style="color:#a0a0a0;font-size:14px;margin-top:0">Taxi Teià · ${esc(b.client_name)}</p>
        <hr style="border-color:#2a2a2a;margin:24px 0"/>
        ${isConfirmed ? `
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#a0a0a0;width:160px">${L.dateTime}</td><td style="color:#C9A84C"><strong>${formatDate(b.start_time, loc)}</strong></td></tr>
          ${b.time_mode === 'arrival' && b.requested_time ? `<tr><td style="padding:8px 0;color:#a0a0a0">${L.arrival}</td><td style="color:#f5f5f5">${formatDate(b.requested_time, loc)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#a0a0a0">${L.pickup}</td><td style="color:#f5f5f5">${esc(b.pickup_address)}</td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">${L.dropoff}</td><td style="color:#f5f5f5">${esc(b.dropoff_address)}</td></tr>
          <tr><td style="padding:8px 0;color:#a0a0a0">${L.passengers}</td><td style="color:#f5f5f5">${esc(pax)}${bags > 0 ? ` · ${esc(bags)} ${esc(L.luggage.toLowerCase())}` : ''}</td></tr>
          ${b.flight_number ? `<tr><td style="padding:8px 0;color:#a0a0a0">${L.flight}</td><td style="color:#C9A84C"><strong>${esc(b.flight_number)}</strong></td></tr>` : ''}
        </table>
        <hr style="border-color:#2a2a2a;margin:24px 0"/>
        <p style="font-size:14px;color:#a0a0a0">${L.change} <strong style="color:#C9A84C">670 254 729</strong> o escriu a <a href="mailto:marctaxiteia@gmail.com" style="color:#C9A84C">marctaxiteia@gmail.com</a>.</p>
        ` : `
        <p style="font-size:14px;color:#a0a0a0">${L.sorry}</p>
        <p style="font-size:14px"><a href="tel:+34670254729" style="color:#C9A84C">670 254 729</a> · <a href="https://wa.me/34670254729" style="color:#C9A84C">WhatsApp</a></p>
        `}
      </div>
      `
    )
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
