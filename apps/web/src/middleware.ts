import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './lib/locales'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // Catalan is the default and therefore has no URL prefix, so with locale
  // detection on it was unreachable: every request to a bare path like /book
  // was redirected to /es/book or /en/book according to the visitor's browser
  // language or NEXT_LOCALE cookie. That both hid Catalan from anyone whose
  // browser is not Catalan and broke the "CA" switcher, which navigates to the
  // unprefixed path. The URL alone now decides the language.
  localeDetection: false,
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
