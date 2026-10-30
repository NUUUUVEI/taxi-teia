'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import {
  Plane, Train, ShoppingBag, MapPin, Stethoscope, Package,
} from 'lucide-react'
import { localePath } from '@/lib/routes'

const ICONS = {
  airports:     Plane,
  trains:       Train,
  local:        ShoppingBag,
  longDistance: MapPin,
  medical:      Stethoscope,
  packages:     Package,
}

const SERVICE_KEYS = ['airports', 'trains', 'local', 'longDistance', 'medical', 'packages'] as const

export function Services() {
  const t = useTranslations('services')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  return (
    <section className="py-16 px-6" id="services">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-ink tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-ink/70">{t('subtitle')}</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICE_KEYS.map((key) => {
            const Icon = ICONS[key]
            return (
              <div key={key} className="panel rounded-2xl p-7 h-full">
                <div className="w-11 h-11 rounded-full bg-taxi flex items-center justify-center mb-5">
                  <Icon size={20} className="text-ink" />
                </div>
                <h3 className="font-heading text-xl font-bold text-ink mb-2">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="font-body text-base text-ink/70 leading-relaxed">
                  {t(`items.${key}.description`)}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href={localePath(locale, '/book')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-taxi text-ink text-lg font-body font-bold rounded-full hover:bg-taxi-light transition-colors duration-200"
          >
            {tNav('book')}
          </Link>
        </div>
      </div>
    </section>
  )
}
