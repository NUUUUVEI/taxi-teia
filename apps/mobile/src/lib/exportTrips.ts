import * as FileSystem from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { addMinutes, endOfDay, format, startOfDay } from 'date-fns'
import { supabase } from './supabase'
import { STATUS_LABEL, type Booking, type BookingStatus } from './types'

export async function fetchTrips(from: Date, to: Date, includePending: boolean) {
  const statuses: BookingStatus[] = includePending ? ['confirmed', 'pending'] : ['confirmed']
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('start_time', startOfDay(from).toISOString())
    .lte('start_time', endOfDay(to).toISOString())
    .in('status', statuses)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as Booking[]
}

// ── Calendar (.ics) ──────────────────────────────────────────────────────────

/** RFC 5545 UTC timestamp, e.g. 20261104T063000Z */
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const icsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

const utf8Length = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0
  return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4
}

/**
 * Lines longer than 75 octets must be folded (continuation lines start with a
 * space, which counts). Counted in UTF-8 bytes so accents never split a line
 * past the limit or cut a character in half.
 */
const fold = (line: string) => {
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const size = utf8Length(ch)
    const limit = parts.length ? 74 : 75
    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

function tripDescription(b: Booking) {
  return [
    `Client: ${b.client_name}`,
    `Telèfon: ${b.client_phone}`,
    `Origen: ${b.pickup_address}`,
    `Destí: ${b.dropoff_address}`,
    `Passatgers: ${b.passengers ?? 1}${b.luggage ? ` · Maletes: ${b.luggage}` : ''}`,
    b.flight_number ? `Vol: ${b.flight_number}` : '',
    b.notes ? `Notes: ${b.notes}` : '',
    b.status === 'pending' ? 'PENDENT de confirmar' : '',
  ].filter(Boolean).join('\n')
}

export function buildIcs(trips: Booking[]) {
  const stamp = icsTime(new Date())
  const events = trips.map((b) => {
    const start = new Date(b.start_time)
    const end = addMinutes(start, b.estimated_minutes || 30)
    return [
      'BEGIN:VEVENT',
      // Stable per booking, so re-importing updates the event instead of duplicating it.
      `UID:${b.id}@taxiteia.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(start)}`,
      `DTEND:${icsTime(end)}`,
      `SUMMARY:${icsText(`${b.status === 'pending' ? '(Pendent) ' : ''}Taxi · ${b.client_name}`)}`,
      `LOCATION:${icsText(b.pickup_address)}`,
      `DESCRIPTION:${icsText(tripDescription(b))}`,
      `STATUS:${b.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'}`,
      'END:VEVENT',
    ].map(fold).join('\r\n')
  })
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taxi Teia//Reserves//CA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Taxi Teià',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const esc = (v: string | number | null | undefined) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildPdfHtml(trips: Booking[], from: Date, to: Date) {
  const byDay = new Map<string, Booking[]>()
  for (const b of trips) {
    const key = format(new Date(b.start_time), 'yyyy-MM-dd')
    byDay.set(key, [...(byDay.get(key) ?? []), b])
  }

  const days = [...byDay.entries()].map(([key, list]) => `
    <h2>${esc(format(new Date(`${key}T12:00:00`), 'EEEE, d MMMM yyyy'))}</h2>
    <table>
      ${list.map((b) => `
        <tr>
          <td class="time">${format(new Date(b.start_time), 'HH:mm')}</td>
          <td>
            <strong>${esc(b.client_name)}</strong> · <a href="tel:${esc(b.client_phone)}">${esc(b.client_phone)}</a>
            ${b.status === 'pending' ? `<span class="tag">${STATUS_LABEL.pending}</span>` : ''}
            <div>${esc(b.pickup_address)} → ${esc(b.dropoff_address)}</div>
            <div class="meta">
              ${esc(b.passengers ?? 1)} pax${b.luggage ? ` · ${esc(b.luggage)} ${b.luggage === 1 ? 'maleta' : 'maletes'}` : ''}
              · ~${esc(b.estimated_minutes)} min
              ${b.flight_number ? ` · Vol <strong>${esc(b.flight_number)}</strong>` : ''}
            </div>
            ${b.notes ? `<div class="meta">${esc(b.notes)}</div>` : ''}
          </td>
        </tr>`).join('')}
    </table>`).join('')

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; color: #1F1B16; padding: 28px; }
      .band { background: #FFC72C; padding: 12px 18px; border-radius: 10px; font-weight: 700; font-size: 18px; }
      h1 { font-size: 22px; margin: 18px 0 2px; }
      .range { color: #5C5346; margin: 0 0 8px; }
      h2 { font-size: 15px; margin: 22px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #FFC72C; text-transform: capitalize; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 6px; border-bottom: 1px solid #DED2BA; vertical-align: top; font-size: 13px; }
      td.time { width: 56px; font-weight: 700; font-size: 15px; }
      .meta { color: #5C5346; font-size: 12px; margin-top: 2px; }
      .tag { background: #FFF1C2; color: #8A5A00; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
      a { color: inherit; }
      .empty { color: #5C5346; margin-top: 24px; }
    </style></head><body>
    <div class="band">Taxi Teià</div>
    <h1>Reserves</h1>
    <p class="range">${esc(format(from, 'd MMMM yyyy'))} – ${esc(format(to, 'd MMMM yyyy'))} · ${trips.length} viatges</p>
    ${trips.length ? days : '<p class="empty">No hi ha reserves en aquestes dates.</p>'}
  </body></html>`
}

// ── Share ────────────────────────────────────────────────────────────────────

const fileStamp = (from: Date, to: Date) => `${format(from, 'yyyyMMdd')}-${format(to, 'yyyyMMdd')}`

export async function shareIcs(trips: Booking[], from: Date, to: Date) {
  const uri = `${FileSystem.cacheDirectory}reserves-${fileStamp(from, to)}.ics`
  await FileSystem.writeAsStringAsync(uri, buildIcs(trips), { encoding: FileSystem.EncodingType.UTF8 })
  await Sharing.shareAsync(uri, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
    dialogTitle: 'Afegeix les reserves al calendari',
  })
}

export async function sharePdf(trips: Booking[], from: Date, to: Date) {
  const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(trips, from, to), base64: false })
  // printToFileAsync picks a random name; give it one that says what it is.
  const named = `${FileSystem.cacheDirectory}reserves-${fileStamp(from, to)}.pdf`
  await FileSystem.deleteAsync(named, { idempotent: true })
  await FileSystem.moveAsync({ from: uri, to: named })
  await Sharing.shareAsync(named, { mimeType: 'application/pdf', dialogTitle: 'Reserves' })
}
