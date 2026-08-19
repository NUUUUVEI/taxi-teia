import { ca, es, enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'

export const dateLocales: Record<string, Locale> = {
  ca,
  es,
  en: enUS,
}

export const emailLocales: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-GB',
}
