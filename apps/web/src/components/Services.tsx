'use client'

import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import {
  Plane, Train, ShoppingBag, MapPin, Stethoscope, Package,
} from 'lucide-react'

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
    <section className="py-24 px-6 relative" id="services">
      {/* subtle top separator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-gold/30" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-gold font-body text-xs tracking-[0.3em] uppercase mb-4">
            {t('subtitle')}
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white">
            {t('title')}
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICE_KEYS.map((key, i) => {
            const Icon = ICONS[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="group glass rounded-sm p-7 h-full border border-white/5 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5">
                  <div className="w-10 h-10 rounded-sm border border-gold/30 flex items-center justify-center mb-5 group-hover:border-gold/60 group-hover:bg-gold/5 transition-all duration-300">
                    <Icon size={18} className="text-gold" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-white mb-3">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="font-body text-sm text-white/55 leading-relaxed">
                    {t(`items.${key}.description`)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-14"
        >
          <Link
            href={`/${locale}/book`}
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-gold text-black text-sm font-body font-semibold tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors duration-200"
          >
            {tNav('book')}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
