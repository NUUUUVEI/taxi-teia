import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales, type Locale } from '@/i18n'
import { buildMetadata } from '@/lib/metadata'
import { StructuredData } from '@/components/StructuredData'
import '../globals.css'

// Signage-like headings; body text in a face designed for low-vision
// readers, since many customers are older village residents.
const heading = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const body = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '700'],
  display: 'swap',
})

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return buildMetadata(locale, 'home')
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as Locale)) notFound()

  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} className="scroll-smooth">
      <body
        className={`${heading.variable} ${body.variable} bg-paper text-ink font-body antialiased`}
      >
        <StructuredData locale={locale} />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
