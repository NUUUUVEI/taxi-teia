/**
 * Official taxi tariffs, in euros.
 *
 * Teià grants its own municipal taxi licences, so it is outside the Barcelona
 * metropolitan taxi area (IMET) and the AMB urban tariffs do not apply. Trips
 * leaving Teià are interurban services, priced under the Generalitat's annual
 * order for interurban taxi tariffs (class VT authorisations, routes entirely
 * within Catalonia).
 *
 * These are regulated prices, not Marc's own. They are revised every January —
 * update `year` and the figures below together, and nothing else needs touching
 * because the prices page renders straight from here.
 */

export const tariff = {
  year: 2026,

  /** Weekdays 08:00–20:00. */
  t6: {
    perKm: 0.82,
    waitingPerHour: 22.47,
    waitingPerQuarter: 5.62,
    minimum: 7.25,
  },

  /** Saturdays, Sundays, public holidays, and weekdays 20:00–08:00. */
  t7: {
    perKm: 0.89,
    waitingPerHour: 24.32,
    waitingPerQuarter: 6.08,
    minimum: 7.9,
  },

  supplements: {
    airport: 4.6,
    moreThanFourPassengers: 4.6,
    /** Nights of 23–24 June, 24–25 Dec and 31 Dec–1 Jan, 20:00–08:00. */
    specialNights: 4.6,
    luggage: 0,
  },
} as const

export const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-GB' : `${locale}-ES`, {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
