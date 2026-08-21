import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, locales, type Locale } from './lib/locales'

export { locales, defaultLocale }
export type { Locale }

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
