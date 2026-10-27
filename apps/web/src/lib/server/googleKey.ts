/**
 * Key for Google calls made from the server (Places autocomplete, Directions).
 *
 * The browser key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) should be restricted to
 * the site's HTTP referrers, and Google rejects referrer-restricted keys on
 * server-to-server calls. GOOGLE_MAPS_SERVER_KEY is a separate key restricted
 * by API instead; without one the browser key is used, which works only while
 * it has no referrer restriction.
 */
export function mapsServerKey(): string | null {
  for (const name of ['GOOGLE_MAPS_SERVER_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']) {
    const value = process.env[name]?.trim()
    if (value && !value.includes('your-')) return value
  }
  return null
}
