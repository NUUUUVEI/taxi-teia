import { NextRequest, NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/server/availability'

export async function POST(req: NextRequest) {
  const { pickup, dropoff, start_time, estimated_minutes } = await req.json()

  const start = new Date(start_time)
  const minutes = Number(estimated_minutes)

  if (
    typeof pickup !== 'string' || !pickup.trim() ||
    typeof dropoff !== 'string' || !dropoff.trim() ||
    Number.isNaN(start.getTime()) ||
    !Number.isFinite(minutes)
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const availability = await checkAvailability({
    pickup: pickup.slice(0, 300),
    dropoff: dropoff.slice(0, 300),
    start,
    durationMinutes: Math.min(600, Math.max(1, Math.round(minutes))),
  })

  return NextResponse.json(availability)
}
