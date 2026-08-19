import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales, type Locale } from '@/i18n'
import { ensureCarImages } from '@/lib/ensureCarImages'
import '../globals.css'

ensureCarImages()

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Taxi Teià — Servei professional de taxi',
  description:
    'Servei professional de taxi a Teià i el Maresme. Aeroports, hospitals, llarg recorregut i més. Truca al 670 254 729.',
  keywords: ['taxi', 'Teià', 'Maresme', 'aeroport', 'Barcelona', 'transport'],
  openGraph: {
    title: 'Taxi Teià',
    description: 'Servei professional de taxi a Teià i el Maresme',
    locale: 'ca_ES',
    type: 'website',
  },
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
        className={`${cormorant.variable} ${inter.variable} bg-black text-white antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
