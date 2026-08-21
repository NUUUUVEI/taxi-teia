import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { defaultLocale, locales } from './locales'
import { localePath, pagePaths, type PageKey } from './routes'
import { business, localeTags, ogLocales, siteUrl } from './site'

export { pagePaths, localePath }
export type { PageKey }

export function localeUrl(locale: string, path: string) {
  return `${siteUrl}${localePath(locale, path)}`
}

function languageAlternates(path: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[localeTags[locale] ?? locale] = localeUrl(locale, path)
  }
  languages['x-default'] = localeUrl(defaultLocale, path)
  return languages
}

/**
 * Builds the full metadata block for one page in one locale: canonical URL,
 * hreflang alternates for the other two languages, and Open Graph tags.
 */
export async function buildMetadata(
  locale: string,
  page: PageKey,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' })
  const path = pagePaths[page]
  const title = t(`${page}.title`)
  const description = t(`${page}.description`)
  const url = localeUrl(locale, path)

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: 'website',
      siteName: business.brand,
      title,
      description,
      url,
      locale: ogLocales[locale] ?? 'ca_ES',
      alternateLocale: locales
        .filter((l) => l !== locale)
        .map((l) => ogLocales[l])
        .filter(Boolean),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
