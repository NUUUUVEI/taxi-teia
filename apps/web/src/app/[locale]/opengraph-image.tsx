import { ImageResponse } from 'next/og'
import { locales } from '@/lib/locales'
import { business, contact } from '@/lib/site'

export const alt = 'Taxi Teià'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * Generated share card, so a link pasted into WhatsApp renders a branded
 * preview without needing a committed image asset.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #0A0A0A 0%, #16130B 55%, #0A0A0A 100%)',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            letterSpacing: 14,
            color: '#C9A84C',
          }}
        >
          TEIÀ · MARESME
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 128,
            fontWeight: 700,
            marginTop: 20,
            color: '#F5E9C0',
          }}
        >
          {business.brand}
        </div>
        <div
          style={{
            display: 'flex',
            width: 220,
            height: 3,
            marginTop: 32,
            marginBottom: 32,
            background: '#C9A84C',
          }}
        />
        <div style={{ display: 'flex', fontSize: 42, color: '#CFCFCF' }}>
          Aeroport · Hospitals · Llarg recorregut
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 52,
            marginTop: 28,
            fontWeight: 600,
          }}
        >
          {contact.phone}
        </div>
      </div>
    ),
    size,
  )
}
