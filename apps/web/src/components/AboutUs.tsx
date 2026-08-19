'use client'

import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Shield, Clock, MapPin, Star, Phone, Heart } from 'lucide-react'

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
    <section className="py-24 px-6 relative overflow-hidden" id="about">
      {/* Background accent */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-gold/3 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-gold font-body text-xs tracking-[0.3em] uppercase mb-4">
              {t('badge')}
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight">
              {t('title')}
            </h2>
            <div className="w-12 h-px bg-gold mb-6" />
            <p className="text-white/60 font-body text-base leading-relaxed mb-4">
              {t('p1')}
            </p>
            <p className="text-white/60 font-body text-base leading-relaxed mb-8">
              {t('p2')}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              {(['years', 'trips', 'rating'] as const).map((stat) => (
                <div key={stat}>
                  <p className="font-heading text-3xl font-semibold text-gold">
                    {t(`stats.${stat}.value`)}
                  </p>
                  <p className="text-white/40 font-body text-xs tracking-widest uppercase mt-1">
                    {t(`stats.${stat}.label`)}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href={`/${locale}/book`}
              className="inline-flex items-center gap-3 px-8 py-3.5 bg-gold text-black text-sm font-body font-semibold tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors duration-200"
            >
              {tNav('book')}
            </Link>
          </motion.div>

          {/* Right — reasons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REASONS.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass rounded-sm p-5 border border-white/5 hover:border-gold/20 transition-colors duration-300"
              >
                <div className="w-8 h-8 rounded-sm border border-gold/20 flex items-center justify-center mb-3">
                  <Icon size={15} className="text-gold" />
                </div>
                <h3 className="font-heading text-base font-semibold text-white mb-1">
                  {t(`reasons.${key}.title`)}
                </h3>
                <p className="text-white/45 font-body text-xs leading-relaxed">
                  {t(`reasons.${key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
