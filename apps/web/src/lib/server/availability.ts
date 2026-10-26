import { addMinutes, subHours, addHours, parseISO } from 'date-fns'
import { getSupabaseAdmin } from './supabaseAdmin'
import { getDirections } from './directions'

/** Slack added to every repositioning drive between two trips. */
const BUFFER_MINUTES = 10
/** Ignore the driver's position once it is this stale. */
const LOCATION_MAX_AGE_MINUTES = 60
/** Trips further away than this cannot clash with the new one. */
const WINDOW_HOURS = 12

/**
 * Times are ISO strings so the browser can show them in the visitor's own
 * time zone; the reason keys match booking.feasibility.* in messages/.
 */
export type Availability =
  | { status: 'ok' }
  | { status: 'blocked'; reason: 'past' }
  | { status: 'blocked'; reason: 'overlap'; start: string; end: string }
  | { status: 'blocked'; reason: 'transfer'; time: string; minutes: number }
  | { status: 'blocked'; reason: 'driverTooFar'; minutes: number }

type Trip = {
  start_time: string
  estimated_minutes: number
  pickup_address: string
  dropoff_address: string
}

/**
 * Does a new trip fit Marc's agenda? Runs on the server only, because it needs
 * other clients' bookings and the driver's live position, neither of which the
 * public may read. When something cannot be checked (no database, Google down)
 * it answers ok: Marc still accepts or rejects every request by hand.
 */
export async function checkAvailability(input: {
  pickup: string
  dropoff: string
  start: Date
  durationMinutes: number
}): Promise<Availability> {
  const { pickup, dropoff, start, durationMinutes } = input
  const now = new Date()

  if (start <= now) return { status: 'blocked', reason: 'past' }

  const db = getSupabaseAdmin()
  if (!db) return { status: 'ok' }

  const end = addMinutes(start, durationMinutes)

  const { data, error } = await db
    .from('bookings')
    .select('start_time, estimated_minutes, pickup_address, dropoff_address')
    .gte('start_time', subHours(start, WINDOW_HOURS).toISOString())
    .lte('start_time', addHours(end, WINDOW_HOURS).toISOString())
    .neq('status', 'cancelled')

  if (error) {
    console.error('Availability query failed:', error)
    return { status: 'ok' }
  }

  const trips = ((data ?? []) as Trip[]).map((trip) => {
    const tripStart = parseISO(trip.start_time)
    return { ...trip, tripStart, tripEnd: addMinutes(tripStart, trip.estimated_minutes) }
  })

  for (const trip of trips) {
    if (start < trip.tripEnd && trip.tripStart < end) {
      return {
        status: 'blocked',
        reason: 'overlap',
        start: trip.tripStart.toISOString(),
        end: trip.tripEnd.toISOString(),
      }
    }
  }

  // Only the trips immediately before and after matter for repositioning.
  const previous = trips
    .filter((trip) => trip.tripEnd <= start)
    .sort((a, b) => b.tripEnd.getTime() - a.tripEnd.getTime())[0]
  const next = trips
    .filter((trip) => trip.tripStart >= end)
    .sort((a, b) => a.tripStart.getTime() - b.tripStart.getTime())[0]

  const gaps = [
    previous && {
      trip: previous,
      origin: previous.dropoff_address,
      dest: pickup,
      gapStart: previous.tripEnd,
      gapEnd: start,
    },
    next && {
      trip: next,
      origin: dropoff,
      dest: next.pickup_address,
      gapStart: end,
      gapEnd: next.tripStart,
    },
  ]

  for (const gap of gaps) {
    if (!gap) continue
    const transfer = await getDirections(
      gap.origin,
      gap.dest,
      Math.floor(gap.gapStart.getTime() / 1000)
    )
    const transferMin = (transfer?.duration_minutes ?? 20) + BUFFER_MINUTES
    if (addMinutes(gap.gapStart, transferMin) > gap.gapEnd) {
      return {
        status: 'blocked',
        reason: 'transfer',
        time: gap.trip.tripStart.toISOString(),
        minutes: transferMin,
      }
    }
  }

  const { data: location } = await db
    .from('driver_location')
    .select('lat, lng, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (location) {
    const ageMinutes = (now.getTime() - new Date(location.updated_at).getTime()) / 60000
    if (ageMinutes < LOCATION_MAX_AGE_MINUTES) {
      const minutesUntilTrip = (start.getTime() - now.getTime()) / 60000
      const drive = await getDirections(
        `${location.lat},${location.lng}`,
        pickup,
        Math.floor(now.getTime() / 1000)
      )
      const driveMin = drive?.duration_minutes ?? 0
      if (driveMin > minutesUntilTrip) {
        return { status: 'blocked', reason: 'driverTooFar', minutes: Math.ceil(driveMin) }
      }
    }
  }

  return { status: 'ok' }
}
