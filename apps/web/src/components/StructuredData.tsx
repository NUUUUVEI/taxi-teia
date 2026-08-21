import { getTranslations } from 'next-intl/server'
import { locales } from '@/lib/locales'
import { localeUrl } from '@/lib/metadata'
import { business, contact, isPending, localeTags, siteUrl } from '@/lib/site'

/**
 * JSON-LD for the whole site, emitted once per page from the locale layout.
 *
 * Uses a @graph so the physical business (LocalBusiness — eligible for local
 * rich results and the map pack) and the thing it sells (TaxiService) are
 * separate nodes that reference each other, which is what Google expects.
 */
export async function StructuredData({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'meta' })

  const businessId = `${siteUrl}/#business`
  const homeUrl = localeUrl(locale, '/')

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'LocalBusiness',
      '@id': businessId,
      additionalType: 'https://schema.org/TaxiService',
      name: business.brand,
      ...(isPending(business.legalName) ? {} : { legalName: business.legalName }),
      ...(isPending(business.taxId) ? {} : { taxID: business.taxId }),
      description: t('home.description'),
      url: homeUrl,
      telephone: contact.phoneE164,
      email: contact.email,
      priceRange: business.priceRange,
      foundingDate: String(business.foundingYear),
      currenciesAccepted: 'EUR',
      address: {
        '@type': 'PostalAddress',
        addressLocality: contact.town,
        addressRegion: contact.province,
        postalCode: contact.postalCode,
        addressCountry: contact.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: contact.latitude,
        longitude: contact.longitude,
      },
      areaServed: business.areaServed.map((name) => ({
        '@type': 'Place',
        name,
      })),
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: '00:00',
          closes: '23:59',
        },
      ],
      potentialAction: {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: localeUrl(locale, '/book'),
          actionPlatform: [
            'https://schema.org/DesktopWebPlatform',
            'https://schema.org/MobileWebPlatform',
          ],
        },
        result: { '@type': 'Reservation', name: t('book.title') },
      },
    },
    {
      '@type': 'TaxiService',
      '@id': `${siteUrl}/#service`,
      name: t('services.title'),
      description: t('services.description'),
      provider: { '@id': businessId },
      serviceType: 'Taxi',
      areaServed: business.areaServed.map((name) => ({
        '@type': 'Place',
        name,
      })),
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: localeUrl(locale, '/book'),
        servicePhone: {
          '@type': 'ContactPoint',
          telephone: contact.phoneE164,
          contactType: 'reservations',
          availableLanguage: locales.map((l) => localeTags[l] ?? l),
        },
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: homeUrl,
      name: business.brand,
      inLanguage: localeTags[locale] ?? locale,
      publisher: { '@id': businessId },
    },
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': graph,
        }),
      }}
    />
  )
}
