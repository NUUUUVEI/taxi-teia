import { Nav } from '@/components/Nav'
import { BookingPage } from '@/components/BookingPage'
import { Footer } from '@/components/Footer'

export default function BookPage() {
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
