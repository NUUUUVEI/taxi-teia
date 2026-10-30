/**
 * Client-facing booking emails, in the language the client booked in.
 *
 * Every time is rendered in Europe/Madrid: Edge Functions run in UTC, so
 * without an explicit zone the emails were one or two hours off.
 */

export interface Booking {
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

export type ClientEmailKind =
  | 'received'
  | 'confirmed'
  | 'rescheduled'
  | 'unavailable'
  | 'cancelled'

const TIME_ZONE = 'Europe/Madrid'
const PHONE_DISPLAY = '670 254 729'
const PHONE_LINK = 'tel:+34670254729'
const WHATSAPP_LINK = 'https://wa.me/34670254729'
const CONTACT_EMAIL = 'marctaxiteia@gmail.com'

// Same palette as the website: cream paper, warm ink, taxi yellow.
const PAPER = '#FBF6EC'
const YELLOW = '#FFC72C'
const ACCENT = '#8A5A00'
const MUTED = '#5C5346'
const TEXT = '#1F1B16'
const LINE = '#DED2BA'

const LOCALE_TAGS: Record<string, string> = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' }

/** These emails interpolate text typed into a public form, so escape it. */
export function esc(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatDate(iso: string, locale = 'ca') {
  return new Date(iso).toLocaleString(LOCALE_TAGS[locale] ?? 'ca-ES', {
    timeZone: TIME_ZONE,
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatShort(iso: string, locale = 'ca') {
  return new Date(iso).toLocaleString(LOCALE_TAGS[locale] ?? 'ca-ES', {
    timeZone: TIME_ZONE,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const COPY = {
  ca: {
    dateTime: 'Data i hora de recollida',
    arrival: 'Arribada sol·licitada',
    pickup: 'Recollida',
    dropoff: 'Destí',
    passengers: 'Passatgers',
    luggage: 'maletes',
    flight: 'Vol',
    before: 'Abans',
    now: 'Ara',
    contact: 'Per a qualsevol canvi, truca al',
    or: 'o escriu a',
    received: {
      subject: (d: string) => `Sol·licitud rebuda — ${d}`,
      heading: 'Sol·licitud rebuda',
      intro: "He rebut la teva sol·licitud. Encara no està confirmada: la reviso i te la confirmo aviat. Si cal canviar l'hora o algun detall, et contactaré abans del viatge.",
    },
    confirmed: {
      subject: (d: string) => `Reserva confirmada — ${d}`,
      heading: '✓ Reserva confirmada',
      intro: 'La teva reserva està confirmada. Ens veiem a la recollida!',
      timeChanged: "He hagut d'ajustar l'hora de recollida respecte a la que havies demanat.",
    },
    rescheduled: {
      subject: (d: string) => `Canvi d'hora — ${d}`,
      heading: "Canvi d'hora de recollida",
      intro: "He hagut de canviar l'hora de recollida de la teva reserva. Si la nova hora no et va bé, truca'm o escriu-me per WhatsApp.",
    },
    unavailable: {
      subject: () => 'Reserva no disponible — Taxi Teià',
      heading: '✗ Reserva no disponible',
      intro: "Ho sento, no puc fer el servei a l'hora que has demanat. Contacta'm i buscarem una alternativa.",
    },
    cancelled: {
      subject: () => 'Reserva cancel·lada — Taxi Teià',
      heading: '✗ Reserva cancel·lada',
      intro: "Ho sento, he hagut de cancel·lar la teva reserva. Contacta'm i buscarem una alternativa.",
    },
  },
  es: {
    dateTime: 'Fecha y hora de recogida',
    arrival: 'Llegada solicitada',
    pickup: 'Recogida',
    dropoff: 'Destino',
    passengers: 'Pasajeros',
    luggage: 'maletas',
    flight: 'Vuelo',
    before: 'Antes',
    now: 'Ahora',
    contact: 'Para cualquier cambio, llama al',
    or: 'o escribe a',
    received: {
      subject: (d: string) => `Solicitud recibida — ${d}`,
      heading: 'Solicitud recibida',
      intro: 'He recibido tu solicitud. Todavía no está confirmada: la reviso y te la confirmo pronto. Si hay que cambiar la hora o algún detalle, te contactaré antes del viaje.',
    },
    confirmed: {
      subject: (d: string) => `Reserva confirmada — ${d}`,
      heading: '✓ Reserva confirmada',
      intro: 'Tu reserva está confirmada. ¡Nos vemos en la recogida!',
      timeChanged: 'He tenido que ajustar la hora de recogida respecto a la que pediste.',
    },
    rescheduled: {
      subject: (d: string) => `Cambio de hora — ${d}`,
      heading: 'Cambio de hora de recogida',
      intro: 'He tenido que cambiar la hora de recogida de tu reserva. Si la nueva hora no te va bien, llámame o escríbeme por WhatsApp.',
    },
    unavailable: {
      subject: () => 'Reserva no disponible — Taxi Teià',
      heading: '✗ Reserva no disponible',
      intro: 'Lo siento, no puedo hacer el servicio a la hora que has pedido. Contáctame y buscaremos una alternativa.',
    },
    cancelled: {
      subject: () => 'Reserva cancelada — Taxi Teià',
      heading: '✗ Reserva cancelada',
      intro: 'Lo siento, he tenido que cancelar tu reserva. Contáctame y buscaremos una alternativa.',
    },
  },
  en: {
    dateTime: 'Pick-up date & time',
    arrival: 'Requested arrival',
    pickup: 'Pick-up',
    dropoff: 'Drop-off',
    passengers: 'Passengers',
    luggage: 'suitcases',
    flight: 'Flight',
    before: 'Before',
    now: 'Now',
    contact: 'For any changes, call',
    or: 'or email',
    received: {
      subject: (d: string) => `Request received — ${d}`,
      heading: 'Request received',
      intro: 'I have received your request. It is not confirmed yet: I will review it and confirm shortly. If the time or any detail needs to change, I will contact you before the trip.',
    },
    confirmed: {
      subject: (d: string) => `Booking confirmed — ${d}`,
      heading: '✓ Booking confirmed',
      intro: 'Your booking is confirmed. See you at the pick-up!',
      timeChanged: 'I had to adjust the pick-up time from the one you asked for.',
    },
    rescheduled: {
      subject: (d: string) => `Pick-up time changed — ${d}`,
      heading: 'Pick-up time changed',
      intro: 'I had to change the pick-up time of your booking. If the new time does not suit you, call me or send a WhatsApp.',
    },
    unavailable: {
      subject: () => 'Booking unavailable — Taxi Teià',
      heading: '✗ Booking unavailable',
      intro: 'Sorry, I cannot do the trip at the time you asked for. Contact me and we will find an alternative.',
    },
    cancelled: {
      subject: () => 'Booking cancelled — Taxi Teià',
      heading: '✗ Booking cancelled',
      intro: 'Sorry, I had to cancel your booking. Contact me and we will find an alternative.',
    },
  },
}

type Copy = (typeof COPY)['ca']

function row(label: string, value: string, highlight = false) {
  const color = highlight ? ACCENT : TEXT
  return `<tr><td style="padding:8px 0;color:${MUTED};width:160px">${label}</td><td style="color:${color}">${highlight ? `<strong>${value}</strong>` : value}</td></tr>`
}

function details(b: Booking, L: Copy, loc: string, previousStart?: string) {
  const pax = b.passengers ?? 1
  const bags = b.luggage ?? 0
  const rows = [
    previousStart
      ? row(L.before, `<s>${formatDate(previousStart, loc)}</s>`) +
        row(L.now, formatDate(b.start_time, loc), true)
      : row(L.dateTime, formatDate(b.start_time, loc), true),
    b.time_mode === 'arrival' && b.requested_time
      ? row(L.arrival, formatDate(b.requested_time, loc))
      : '',
    row(L.pickup, esc(b.pickup_address)),
    row(L.dropoff, esc(b.dropoff_address)),
    row(L.passengers, `${esc(pax)}${bags > 0 ? ` · ${esc(bags)} ${L.luggage}` : ''}`),
    b.flight_number ? row(L.flight, esc(b.flight_number), true) : '',
  ]
  return `<table style="width:100%;font-size:14px;border-collapse:collapse">${rows.join('')}</table>`
}

function contact(L: Copy) {
  return `<p style="font-size:14px;color:${MUTED}">${L.contact} <a href="${PHONE_LINK}" style="color:${ACCENT}"><strong>${PHONE_DISPLAY}</strong></a> (<a href="${WHATSAPP_LINK}" style="color:${ACCENT}">WhatsApp</a>) ${L.or} <a href="mailto:${CONTACT_EMAIL}" style="color:${ACCENT}">${CONTACT_EMAIL}</a>.</p>`
}

/**
 * @param previousStart the old pick-up time when this email reports a change.
 */
export function clientEmail(kind: ClientEmailKind, b: Booking, previousStart?: string) {
  const loc = (b.locale ?? 'ca') in COPY ? (b.locale ?? 'ca') : 'ca'
  const L = COPY[loc as keyof typeof COPY]
  const K = L[kind]
  const when = formatShort(b.start_time, loc)
  const negative = kind === 'unavailable' || kind === 'cancelled'
  const headingColor = negative ? '#B42318' : kind === 'confirmed' ? '#1E7B3C' : TEXT
  const extra = kind === 'confirmed' && previousStart ? `<p style="font-size:14px;color:${ACCENT}"><strong>${L.confirmed.timeChanged}</strong></p>` : ''

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:${PAPER};color:${TEXT};border-radius:12px;overflow:hidden;border:1px solid ${LINE}">
      <div style="background:${YELLOW};padding:14px 32px;font-weight:bold;font-size:16px;color:${TEXT}">Taxi Teià</div>
      <div style="padding:32px">
      <h2 style="color:${headingColor};margin:0 0 4px">${K.heading}</h2>
      <p style="color:${MUTED};font-size:14px;margin-top:0">${esc(b.client_name)}</p>
      <hr style="border:0;border-top:1px solid ${LINE};margin:24px 0"/>
      <p style="font-size:14px;color:${TEXT};line-height:1.5">${K.intro}</p>
      ${extra}
      ${details(b, L, loc, previousStart)}
      <hr style="border:0;border-top:1px solid ${LINE};margin:24px 0"/>
      ${contact(L)}
      </div>
    </div>
  `

  return { subject: K.subject(when), html }
}

/**
 * Which email, if any, the client should get for this update. One update can
 * both move the time and confirm ("Guardar i acceptar"); that sends a single
 * confirmation that mentions the new time rather than two emails.
 */
export function emailForUpdate(b: Booking, old: Booking | undefined):
  { kind: ClientEmailKind; previousStart?: string } | null {
  if (!old) return null

  const statusChanged = old.status !== b.status
  const timeChanged = new Date(old.start_time).getTime() !== new Date(b.start_time).getTime()
  const previousStart = timeChanged ? old.start_time : undefined

  if (statusChanged) {
    if (b.status === 'confirmed') return { kind: 'confirmed', previousStart }
    if (b.status === 'cancelled') {
      return { kind: old.status === 'confirmed' ? 'cancelled' : 'unavailable' }
    }
    return null
  }

  if (timeChanged && (b.status === 'pending' || b.status === 'confirmed')) {
    return { kind: 'rescheduled', previousStart }
  }

  return null
}
