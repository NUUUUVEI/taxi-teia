import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales, type Locale } from '@/i18n'
import { buildMetadata } from '@/lib/metadata'
import { StructuredData } from '@/components/StructuredData'
import '../globals.css'

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
        className={`${cormorant.variable} ${inter.variable} bg-black text-white antialiased`}
      >
        <StructuredData locale={locale} />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
