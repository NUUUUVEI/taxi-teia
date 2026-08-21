/**
 * Central site + business identity.
 *
 * Values marked TODO are legally required on the "Avís legal" page (Spain,
 * LSSI-CE art. 10) and must be filled in with Marc's real registration data
 * before the site is treated as final. Anything left as PENDING renders as a
 * visible warning on the legal page instead of silently showing nothing.
 */

export const PENDING = 'PENDING'

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://taxi-teia-web.vercel.app'
).replace(/\/$/, '')

export const contact = {
  phone: '670 254 729',
  /** E.164 for tel: and wa.me links */
  phoneE164: '+34670254729',
  email: 'marctaxiteia@gmail.com',
  town: 'Teià',
  region: 'Maresme',
  province: 'Barcelona',
  country: 'ES',
  postalCode: '08329',
  latitude: 41.4936,
  longitude: 2.3186,
}

export const business = {
  brand: 'Taxi Teià',

  // TODO — replace with the registered name (autònom full name or company name)
  legalName: PENDING,
  // TODO — NIF / DNI of the licence holder
  taxId: PENDING,
  // TODO — full registered address for the legal notice
  registeredAddress: PENDING,
  // TODO — municipal taxi licence number (footer currently shows VT-XXXXX)
  taxiLicence: PENDING,

  foundingYear: 2015,
  priceRange: '€€',
  areaServed: ['Teià', 'El Masnou', 'Premià de Mar', 'Vilassar de Mar', 'Maresme', 'Barcelona'],
}

export const isPending = (value: string) => value === PENDING

/** Bump when the legal or privacy text changes; shown on both legal pages. */
export const legalUpdatedAt = new Date('2026-08-21T00:00:00Z')

/** Locale → BCP-47 tag used for hreflang and og:locale. */
export const localeTags: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-GB',
}

export const ogLocales: Record<string, string> = {
  ca: 'ca_ES',
  es: 'es_ES',
  en: 'en_GB',
}
