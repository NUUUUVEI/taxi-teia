import { NextRequest, NextResponse } from 'next/server'

const TEIA = { lat: 41.498, lng: 2.322 }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const language = req.nextUrl.searchParams.get('language') ?? 'ca'
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!q || q.length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  if (!key) {
    return NextResponse.json({ error: 'Google Maps API key missing' }, { status: 500 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', q)
  url.searchParams.set('key', key)
  url.searchParams.set('language', language)
  url.searchParams.set('components', 'country:es')
  url.searchParams.set('location', `${TEIA.lat},${TEIA.lng}`)
  url.searchParams.set('radius', '80000')

  const res = await fetch(url.toString())
  const data = await res.json()

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
