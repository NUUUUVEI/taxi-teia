'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
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
        <span className="text-gold text-xs font-body tracking-[0.3em] uppercase block mb-3">
          {t('badge')}
        </span>
        <h1 className="font-heading font-light text-4xl md:text-6xl text-white mb-4">
          {t('title')}
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-6" />
        <p className="text-white/60 font-body leading-relaxed max-w-2xl mx-auto">
          {t('lead')}
        </p>
      </div>

      {/* Tariff bands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-14">
        {bands.map((band, i) => (
          <motion.div
            key={band.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-sm border border-border bg-card/60 p-7"
          >
            <div className="flex items-center gap-3 mb-1">
              <band.icon size={16} className="text-gold" />
              <h2 className="font-heading text-2xl text-white">{band.name}</h2>
            </div>
            <p className="text-white/40 font-body text-xs mb-6">{band.when}</p>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-heading text-4xl text-gold">
                {eur(band.rates.perKm)}
              </span>
              <span className="text-white/40 font-body text-sm">
                {t('perKm')}
              </span>
            </div>

            <dl className="flex flex-col gap-3 text-sm font-body">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/40">{t('minimum')}</dt>
                <dd className="text-white/85">{eur(band.rates.minimum)}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-white/40">{t('waitingHour')}</dt>
                <dd className="text-white/85">{eur(band.rates.waitingPerHour)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">{t('waitingQuarter')}</dt>
                <dd className="text-white/85">{eur(band.rates.waitingPerQuarter)}</dd>
              </div>
            </dl>
          </motion.div>
        ))}
      </div>

      {/* Supplements */}
      <section className="mt-14">
        <h2 className="font-heading text-2xl text-white gold-line mb-6">
          {t('supplements.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {supplements.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-sm border border-border bg-card/40 px-5 py-4"
            >
              <span className="flex items-center gap-3 text-white/70 font-body text-sm">
                <item.icon size={15} className="text-gold/60 flex-shrink-0" />
                {item.label}
              </span>
              <span className="text-gold font-body text-sm font-semibold whitespace-nowrap">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="font-heading text-2xl text-white gold-line mb-6">
          {t('how.title')}
        </h2>
        <div className="flex flex-col gap-5">
          {(['meter', 'noSurge', 'receipt', 'updated'] as const).map(
            (key) => (
              <div key={key} className="flex gap-4">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                <p className="text-white/60 font-body text-sm leading-relaxed">
                  {t(`how.${key}`)}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Estimate CTA */}
      <section className="mt-14 rounded-sm border border-gold/25 bg-gold/[0.04] p-8 text-center">
        <Euro size={22} className="text-gold mx-auto mb-4" />
        <h2 className="font-heading text-2xl text-white mb-3">{t('cta.title')}</h2>
        <p className="text-white/60 font-body text-sm leading-relaxed max-w-xl mx-auto mb-7">
          {t('cta.body')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={localePath(locale, '/book')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors"
          >
            {t('cta.book')} <ArrowRight size={14} />
          </Link>
          <a
            href={`tel:${contact.phoneE164}`}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-gold/40 text-gold font-body text-sm tracking-widest uppercase rounded-sm hover:bg-gold/10 transition-colors"
          >
            <Phone size={14} /> {t('cta.call')}
          </a>
        </div>
      </section>

      <p className="mt-10 flex items-start gap-3 text-white/35 font-body text-xs leading-relaxed">
        <Receipt size={14} className="text-gold/50 flex-shrink-0 mt-0.5" />
        {t('disclaimer', { year: tariff.year })}
      </p>
      <p className="mt-3 flex items-start gap-3 text-white/35 font-body text-xs leading-relaxed">
        <Clock size={14} className="text-gold/50 flex-shrink-0 mt-0.5" />
        {t('source')}
      </p>
    </div>
  )
}
