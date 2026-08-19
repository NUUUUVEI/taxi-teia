import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { origin, destination } = await req.json()

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'origin and destination are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
    url.searchParams.set('origin', origin)
    url.searchParams.set('destination', destination)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('key', apiKey)
    // Use a departure time ~1 hour from now for more realistic traffic estimate
    url.searchParams.set('departure_time', String(Math.floor(Date.now() / 1000) + 3600))

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK' || !data.routes?.[0]) {
      return new Response(
        JSON.stringify({ error: 'Could not calculate route', gmaps_status: data.status }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const leg = data.routes[0].legs[0]
    // Prefer duration_in_traffic if available (requires departure_time)
    const durationSeconds =
      leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0
    const distanceMeters = leg.distance?.value ?? 0
    const duration_minutes = Math.ceil(durationSeconds / 60)
    const distance_km = +(distanceMeters / 1000).toFixed(1)

    return new Response(
      JSON.stringify({ duration_minutes, distance_km }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
