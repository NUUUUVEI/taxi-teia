'use client'

import { useState } from 'react'

type RouteMapProps = {
  pickup: string
  dropoff: string
  polyline?: string | null
}

export function RouteMap({ pickup, dropoff, polyline }: RouteMapProps) {
  const [failed, setFailed] = useState(false)
  if (!pickup.trim() || !dropoff.trim() || failed) return null

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key || key.includes('your-')) return null

  const params = new URLSearchParams({
    size: '640x280',
    scale: '2',
    maptype: 'roadmap',
    key,
  })

  params.append('markers', `color:0xFFC72C|label:A|${pickup}`)
  params.append('markers', `color:0x1F1B16|label:B|${dropoff}`)

  if (polyline) {
    params.append('path', `weight:5|color:0x8A5A00|enc:${polyline}`)
  }


  const src = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`

  return (
    <div className="rounded-sm overflow-hidden border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Route map"
        className="w-full h-auto block"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
