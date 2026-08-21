import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { Services } from '@/components/Services'
import { Footer } from '@/components/Footer'
import { buildMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'services')
}

export default function ServicesPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <Services />
      </main>
      <Footer />
    </>
  )
}
