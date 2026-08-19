import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { origin, destination } = await req.json()
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 })
  }

  if (!key) {
    return NextResponse.json({ error: 'Google Maps API key missing' }, { status: 500 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('key', key)
  url.searchParams.set('departure_time', String(Math.floor(Date.now() / 1000) + 3600))

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.routes?.[0]) {
    return NextResponse.json(
      { error: 'Could not calculate route', gmaps_status: data.status },
      { status: 422 }
    )
  }

  const leg = data.routes[0].legs[0]
  const durationSeconds = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0
  const duration_minutes = Math.max(1, Math.ceil(durationSeconds / 60))
  const distance_km = +((leg.distance?.value ?? 0) / 1000).toFixed(1)

  return NextResponse.json({ duration_minutes, distance_km })
}
