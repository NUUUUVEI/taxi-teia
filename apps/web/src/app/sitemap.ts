import type { MetadataRoute } from 'next'
import { defaultLocale, locales } from '@/lib/locales'
import { localeUrl, pagePaths, type PageKey } from '@/lib/metadata'
import { localeTags } from '@/lib/site'

/** Higher priority for the pages that should rank: home, booking, services. */
const priorities: Record<PageKey, number> = {
  home: 1,
  book: 0.9,
  services: 0.8,
  prices: 0.8,
  car: 0.6,
  about: 0.6,
  privacy: 0.2,
  notice: 0.2,
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return (Object.keys(pagePaths) as PageKey[]).flatMap((page) => {
    const path = pagePaths[page]

    // Each locale gets its own entry, with the other two declared as
    // alternates so Google groups them as one page in three languages.
    const languages = Object.fromEntries(
      locales.map((locale) => [localeTags[locale] ?? locale, localeUrl(locale, path)]),
    )

    return locales.map((locale) => ({
      url: localeUrl(locale, path),
      lastModified,
      changeFrequency: (page === 'home' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      priority: locale === defaultLocale ? priorities[page] : priorities[page] * 0.9,
      alternates: { languages },
    }))
  })
}
