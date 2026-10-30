import { mapsServerKey } from './googleKey'

export type Directions = {
  duration_minutes: number
  distance_km: number
  polyline: string | null
}

const TEIA = { lat: 41.498, lng: 2.322 }
const LAT_LNG = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/

/**
 * Directions geocodes plain text with no notion of where we are, so the
 * autocomplete's own "Teià, Espanya" landed near Madrid (626 km to the
 * airport). Resolve text to coordinates with a search biased to Teià first;
 * on any failure fall back to the text and let Directions try.
 */
async function resolvePoint(place: string, key: string): Promise<string> {
  if (LAT_LNG.test(place.trim())) return place
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')
    url.searchParams.set('input', place)
    url.searchParams.set('inputtype', 'textquery')
    url.searchParams.set('fields', 'geometry/location')
    url.searchParams.set('locationbias', `circle:80000@${TEIA.lat},${TEIA.lng}`)
    url.searchParams.set('key', key)
    const data = await (await fetch(url.toString())).json()
    const loc = data.candidates?.[0]?.geometry?.location
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      return `${loc.lat},${loc.lng}`
    }
  } catch (err) {
    console.error('Place lookup failed:', err)
  }
  return place
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

  const [from, to] = await Promise.all([resolvePoint(origin, key), resolvePoint(destination, key)])

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', from)
  url.searchParams.set('destination', to)
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
