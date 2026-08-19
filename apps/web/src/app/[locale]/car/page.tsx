import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { CarPageClient } from '@/components/CarPageClient'
import { Footer } from '@/components/Footer'

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
