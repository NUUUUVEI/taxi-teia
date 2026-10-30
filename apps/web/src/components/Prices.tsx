'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight,
  Clock,
  Euro,
  Moon,
  Phone,
  Plane,
  Receipt,
  Sun,
  Briefcase,
  Users,
} from 'lucide-react'
import { money, tariff } from '@/lib/tariff'
import { localePath } from '@/lib/routes'
import { contact } from '@/lib/site'

export function Prices() {
  const t = useTranslations('prices')
  const locale = useLocale()
  const eur = (value: number) => money(value, locale)

  const bands = [
    {
      key: 't6' as const,
      icon: Sun,
      name: t('bands.t6.name'),
      when: t('bands.t6.when'),
      rates: tariff.t6,
    },
    {
      key: 't7' as const,
      icon: Moon,
      name: t('bands.t7.name'),
      when: t('bands.t7.when'),
      rates: tariff.t7,
    },
  ]

  const supplements = [
    { icon: Plane, label: t('supplements.airport'), value: eur(tariff.supplements.airport) },
    {
      icon: Users,
      label: t('supplements.passengers'),
      value: eur(tariff.supplements.moreThanFourPassengers),
    },
    {
      icon: Moon,
      label: t('supplements.specialNights'),
      value: eur(tariff.supplements.specialNights),
    },
    { icon: Briefcase, label: t('supplements.luggage'), value: t('supplements.free') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center">
        <h1 className="font-heading font-bold text-5xl md:text-6xl text-ink mb-5 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-ink/70 font-body leading-relaxed max-w-2xl mx-auto">
          {t('lead')}
        </p>
      </div>

      {/* Tariff bands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-14">
        {bands.map((band) => (
          <div key={band.key} className="panel rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-1">
              <band.icon size={16} className="text-taxi-deep" />
              <h2 className="font-heading font-bold text-2xl text-ink">{band.name}</h2>
            </div>
            <p className="text-ink/65 font-body text-xs mb-6">{band.when}</p>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-heading font-bold text-4xl text-taxi-deep">
                {eur(band.rates.perKm)}
              </span>
              <span className="text-ink/65 font-body text-sm">
                {t('perKm')}
              </span>
            </div>

            <dl className="flex flex-col gap-3 text-sm font-body">
              <div className="flex justify-between border-b border-ink/5 pb-2">
                <dt className="text-ink/65">{t('minimum')}</dt>
                <dd className="text-ink/85">{eur(band.rates.minimum)}</dd>
              </div>
              <div className="flex justify-between border-b border-ink/5 pb-2">
                <dt className="text-ink/65">{t('waitingHour')}</dt>
                <dd className="text-ink/85">{eur(band.rates.waitingPerHour)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/65">{t('waitingQuarter')}</dt>
                <dd className="text-ink/85">{eur(band.rates.waitingPerQuarter)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Supplements */}
      <section className="mt-14">
        <h2 className="font-heading font-bold text-2xl text-ink taxi-rule mb-6">
          {t('supplements.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {supplements.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-field px-5 py-4">
              <span className="flex items-center gap-3 text-ink/70 font-body text-sm">
                <item.icon size={15} className="text-taxi-deep flex-shrink-0" />
                {item.label}
              </span>
              <span className="text-taxi-deep font-body text-sm font-semibold whitespace-nowrap">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="font-heading font-bold text-2xl text-ink taxi-rule mb-6">
          {t('how.title')}
        </h2>
        <div className="flex flex-col gap-5">
          {(['meter', 'noSurge', 'receipt', 'updated'] as const).map(
            (key) => (
              <div key={key} className="flex gap-4">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-taxi flex-shrink-0" />
                <p className="text-ink/70 font-body text-sm leading-relaxed">
                  {t(`how.${key}`)}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Estimate CTA */}
      <section className="mt-14 panel rounded-2xl p-8 text-center">
        <Euro size={22} className="text-taxi-deep mx-auto mb-4" />
        <h2 className="font-heading font-bold text-2xl text-ink mb-3">{t('cta.title')}</h2>
        <p className="text-ink/70 font-body text-sm leading-relaxed max-w-xl mx-auto mb-7">
          {t('cta.body')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={localePath(locale, '/book')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-taxi text-on-taxi font-body font-bold text-base rounded-full hover:bg-taxi-light transition-colors"
          >
            {t('cta.book')} <ArrowRight size={14} />
          </Link>
          <a
            href={`tel:${contact.phoneE164}`}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 border-2 border-ink/20 text-ink font-body text-base rounded-full hover:border-ink transition-colors"
          >
            <Phone size={14} /> {t('cta.call')}
          </a>
        </div>
      </section>

      <p className="mt-10 flex items-start gap-3 text-ink/60 font-body text-xs leading-relaxed">
        <Receipt size={14} className="text-taxi-deep flex-shrink-0 mt-0.5" />
        {t('disclaimer', { year: tariff.year })}
      </p>
      <p className="mt-3 flex items-start gap-3 text-ink/60 font-body text-xs leading-relaxed">
        <Clock size={14} className="text-taxi-deep flex-shrink-0 mt-0.5" />
        {t('source')}
      </p>
    </div>
  )
}
