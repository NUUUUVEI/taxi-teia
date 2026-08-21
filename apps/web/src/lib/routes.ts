import { defaultLocale } from './locales'

export type PageKey =
  | 'home'
  | 'services'
  | 'prices'
  | 'car'
  | 'about'
  | 'book'
  | 'privacy'
  | 'notice'

/** Route for each page, without the locale prefix. */
export const pagePaths: Record<PageKey, string> = {
  home: '/',
  services: '/services',
  prices: '/prices',
  car: '/car',
  about: '/about',
  book: '/book',
  privacy: '/legal/privacy',
  notice: '/legal/notice',
}

/**
 * Middleware uses localePrefix 'as-needed', so Catalan lives at the bare path
 * and the other locales are prefixed. Links, canonicals and the sitemap all
 * have to match that exactly: linking to /ca/about instead of /about makes
 * every internal link a redirect, which wastes crawl budget.
 */
export function localePath(locale: string, path: string) {
  const suffix = path === '/' ? '' : path
  if (locale === defaultLocale) return suffix || '/'
  return `/${locale}${suffix}`
}
