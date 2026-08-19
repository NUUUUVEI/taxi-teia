import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { Services } from '@/components/Services'
import { Footer } from '@/components/Footer'

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
