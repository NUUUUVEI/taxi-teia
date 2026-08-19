import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Footer } from '@/components/Footer'

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main>
        <Hero />
      </main>
      <Footer />
    </>
  )
}
