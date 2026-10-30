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
          background: '#F5F8FB',
          color: '#14212F',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            letterSpacing: 14,
            color: '#164580',
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
          }}
        >
          {business.brand}
        </div>
        <div
          style={{
            display: 'flex',
            width: 220,
            height: 12,
            marginTop: 32,
            marginBottom: 32,
            background: '#1E5AA8',
          }}
        />
        <div style={{ display: 'flex', fontSize: 42, color: '#4A5869' }}>
          Aeroport · Hospitals · Llarg recorregut
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 52,
            marginTop: 28,
            padding: '12px 40px',
            borderRadius: 999,
            background: '#1E5AA8',
            color: '#FFFFFF',
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
