import { NextRequest, NextResponse } from 'next/server'
import { getDirections } from '@/lib/server/directions'

export async function POST(req: NextRequest) {
  const { origin, destination, departure_time } = await req.json()

  if (typeof origin !== 'string' || typeof destination !== 'string' || !origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key missing' }, { status: 500 })
  }

  const route = await getDirections(
    origin.slice(0, 300),
    destination.slice(0, 300),
    Number.isFinite(departure_time) ? departure_time : undefined
  )

  if (!route) {
    return NextResponse.json({ error: 'Could not calculate route' }, { status: 422 })
  }

  return NextResponse.json(route)
}
