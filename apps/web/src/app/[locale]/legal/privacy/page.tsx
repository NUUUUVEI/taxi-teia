import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { LegalArticle } from '@/components/LegalArticle'
import { buildMetadata } from '@/lib/metadata'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'privacy')
}

export default function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <LegalArticle locale={locale} kind="privacy" />
      </main>
      <Footer />
    </>
  )
}
