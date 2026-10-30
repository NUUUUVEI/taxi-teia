'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Shield, Clock, MapPin, Star, Phone, Heart } from 'lucide-react'
import { localePath } from '@/lib/routes'

const REASONS = [
  { icon: Clock,   key: 'punctuality' },
  { icon: Shield,  key: 'trust'       },
  { icon: MapPin,  key: 'local'       },
  { icon: Star,    key: 'quality'     },
  { icon: Heart,   key: 'personal'    },
  { icon: Phone,   key: 'available'   },
]

export function AboutUs() {
  const t = useTranslations('about')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  return (
    <section className="py-16 px-6" id="about">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-ink mb-6 leading-[1.05] tracking-tight taxi-rule">
              {t('title')}
            </h1>
            <p className="text-ink/75 font-body text-lg leading-relaxed mb-4">
              {t('p1')}
            </p>
            <p className="text-ink/75 font-body text-lg leading-relaxed mb-8">
              {t('p2')}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              {(['years', 'trips', 'rating'] as const).map((stat) => (
                <div key={stat}>
                  <p className="font-heading text-4xl font-bold text-ink">
                    {t(`stats.${stat}.value`)}
                  </p>
                  <p className="text-ink/65 font-body text-sm mt-1">
                    {t(`stats.${stat}.label`)}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href={localePath(locale, '/book')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-taxi text-ink text-lg font-body font-bold rounded-full hover:bg-taxi-light transition-colors duration-200"
            >
              {tNav('book')}
            </Link>
          </div>

          {/* Right — reasons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REASONS.map(({ icon: Icon, key }) => (
              <div key={key} className="panel rounded-2xl p-5">
                <div className="w-9 h-9 rounded-full bg-taxi flex items-center justify-center mb-3">
                  <Icon size={16} className="text-ink" />
                </div>
                <h3 className="font-heading text-lg font-bold text-ink mb-1">
                  {t(`reasons.${key}.title`)}
                </h3>
                <p className="text-ink/70 font-body text-sm leading-relaxed">
                  {t(`reasons.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
