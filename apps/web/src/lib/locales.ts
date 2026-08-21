/**
 * Plain constants, kept out of `i18n.ts` so client components can import them
 * without dragging `next-intl/server` into the browser bundle.
 */
export const locales = ['ca', 'es', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ca'
