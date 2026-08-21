import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { CarPageClient } from '@/components/CarPageClient'
import { Footer } from '@/components/Footer'
import { buildMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'car')
}

export default function CarPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main>
        <CarPageClient />
      </main>
      <Footer />
    </>
  )
}
