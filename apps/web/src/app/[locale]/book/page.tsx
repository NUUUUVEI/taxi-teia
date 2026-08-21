import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { BookingPage } from '@/components/BookingPage'
import { Footer } from '@/components/Footer'
import { buildMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'book')
}

export default function BookPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <BookingPage />
      </main>
      <Footer />
    </>
  )
}
