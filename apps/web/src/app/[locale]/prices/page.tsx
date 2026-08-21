import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { Prices } from '@/components/Prices'
import { Footer } from '@/components/Footer'
import { buildMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'prices')
}

export default function PricesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <Prices />
      </main>
      <Footer />
    </>
  )
}
