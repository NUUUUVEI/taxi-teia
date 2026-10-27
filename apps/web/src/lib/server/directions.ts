import { mapsServerKey } from './googleKey'

export type Directions = {
  duration_minutes: number
  distance_km: number
  polyline: string | null
}

/** Driving time with traffic between two addresses or "lat,lng" pairs. */
export async function getDirections(
  origin: string,
  destination: string,
  departureTime?: number
): Promise<Directions | null> {
  const key = mapsServerKey()
  if (!key) return null

  // Google rejects a departure_time in the past.
  const now = Math.floor(Date.now() / 1000)
  const depTime = Math.max(departureTime ?? now + 3600, now)

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('key', key)
  url.searchParams.set('departure_time', String(depTime))
  url.searchParams.set('traffic_model', 'best_guess')

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.routes?.[0]) {
    // NOT_FOUND / ZERO_RESULTS are bad addresses; anything else is configuration.
    if (data.status !== 'NOT_FOUND' && data.status !== 'ZERO_RESULTS') {
      console.error('Directions failed:', data.status, data.error_message)
    }
    return null
  }

  const leg = data.routes[0].legs[0]
  const durationSeconds = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0
  return {
    duration_minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
    distance_km: +((leg.distance?.value ?? 0) / 1000).toFixed(1),
    polyline: data.routes[0].overview_polyline?.points ?? null,
  }
}
