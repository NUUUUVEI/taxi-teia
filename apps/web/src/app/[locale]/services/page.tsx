import { Nav } from '@/components/Nav'
import { ServicesGrid } from '@/components/ServicesGrid'
import { Footer } from '@/components/Footer'

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <ServicesGrid />
      </main>
      <Footer />
    </>
  )
}
