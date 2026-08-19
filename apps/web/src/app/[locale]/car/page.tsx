import { Nav } from '@/components/Nav'
import { CarPageClient } from '@/components/CarPageClient'
import { Footer } from '@/components/Footer'

export default function CarPage() {
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
