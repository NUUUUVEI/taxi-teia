'use client'

type RouteMapProps = {
  pickup: string
  dropoff: string
  polyline?: string | null
}

export function RouteMap({ pickup, dropoff, polyline }: RouteMapProps) {
  if (!pickup.trim() || !dropoff.trim()) return null

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null

  const params = new URLSearchParams({
    size: '640x280',
    scale: '2',
    maptype: 'roadmap',
    key,
  })

  params.append('markers', `color:0xC9A84C|label:A|${pickup}`)
  params.append('markers', `color:0xEF4444|label:B|${dropoff}`)

  if (polyline) {
    params.append('path', `weight:4|color:0xC9A84C|enc:${polyline}`)
  }

  params.append('style', 'feature:all|element:geometry|color:0x1a1a1a')
  params.append('style', 'feature:road|element:geometry|color:0x2c2c2c')
  params.append('style', 'feature:water|element:geometry|color:0x0e0e0e')
  params.append('style', 'feature:all|element:labels.text.fill|color:0x8a8a8a')

  const src = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`

  return (
    <div className="rounded-sm overflow-hidden border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Route map"
        className="w-full h-auto block"
        loading="lazy"
      />
    </div>
  )
}
