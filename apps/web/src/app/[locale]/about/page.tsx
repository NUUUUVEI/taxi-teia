import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { AboutUs } from '@/components/AboutUs'
import { Footer } from '@/components/Footer'

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <AboutUs />
      </main>
      <Footer />
    </>
  )
}
