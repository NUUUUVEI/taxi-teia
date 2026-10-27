import { NextRequest, NextResponse } from 'next/server'
import { mapsServerKey } from '@/lib/server/googleKey'

const TEIA = { lat: 41.498, lng: 2.322 }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 200) ?? ''
  const language = req.nextUrl.searchParams.get('language') ?? 'ca'
  const key = mapsServerKey()

  if (!q || q.length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  if (!key) {
    console.error('Places autocomplete: no Google Maps key configured')
    return NextResponse.json({ error: 'maps_unavailable', predictions: [] }, { status: 503 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', q)
  url.searchParams.set('key', key)
  url.searchParams.set('language', ['ca', 'es', 'en'].includes(language) ? language : 'ca')
  url.searchParams.set('components', 'country:es')
  url.searchParams.set('location', `${TEIA.lat},${TEIA.lng}`)
  url.searchParams.set('radius', '80000')

  const res = await fetch(url.toString())
  const data = await res.json()

  // Anything but OK / ZERO_RESULTS is a configuration problem (bad key, API
  // not enabled, billing). Say so instead of looking like "no matches".
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Places autocomplete failed:', data.status, data.error_message)
    return NextResponse.json({ error: 'maps_unavailable', predictions: [] }, { status: 502 })
  }

  const predictions = (data.predictions ?? []).map((p: {
    description: string
    place_id: string
    structured_formatting?: { main_text?: string; secondary_text?: string }
  }) => ({
    description: p.description,
    placeId: p.place_id,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }))

  return NextResponse.json({ predictions })
}
