'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plane,
  Train,
  ShoppingBag,
  MapPin,
  Stethoscope,
  Package,
} from 'lucide-react'

const serviceIcons = {
  airports: Plane,
  trains: Train,
  local: ShoppingBag,
  longDistance: MapPin,
  medical: Stethoscope,
  packages: Package,
}

const serviceKeys = ['airports', 'trains', 'local', 'longDistance', 'medical', 'packages'] as const

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function ServicesGrid() {
  const t = useTranslations('services')
  const locale = useLocale()

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <span className="text-gold text-xs font-body tracking-[0.3em] uppercase mb-4 block">
            Taxi Teià
          </span>
          <h1 className="font-heading font-light text-5xl md:text-7xl text-white mb-6 leading-tight">
            {t('title')}
          </h1>
          <div className="w-16 h-px bg-gold mx-auto mb-6" />
          <p className="text-white/50 text-lg font-body max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Services grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {serviceKeys.map((key, index) => {
            const Icon = serviceIcons[key]
            return (
              <motion.div
                key={key}
                variants={cardVariants}
                className="group relative p-8 bg-card border border-border rounded-sm overflow-hidden cursor-default hover:border-gold/40 transition-all duration-500"
              >
                {/* Background gold glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Number */}
                <div className="absolute top-6 right-6 font-heading text-4xl font-light text-white/5 select-none">
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* Icon */}
                <div className="relative mb-6">
                  <div className="w-12 h-12 rounded-sm border border-gold/20 flex items-center justify-center bg-gold/5 group-hover:border-gold/50 group-hover:bg-gold/10 transition-all duration-300">
                    <Icon size={20} className="text-gold" />
                  </div>
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="font-heading text-xl font-medium text-white mb-3 group-hover:text-gold transition-colors duration-300">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="text-white/50 text-sm font-body leading-relaxed">
                    {t(`items.${key}.description`)}
                  </p>
                </div>

                {/* Bottom border animation */}
                <div className="absolute bottom-0 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-500" />
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="text-center mt-20"
        >
          <p className="text-white/40 text-sm font-body mb-6">
            ¿Tienes una necesidad especial? Llámanos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${locale}/book`}
              className="px-8 py-4 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors duration-200"
            >
              Reserva ara
            </Link>
            <a
              href="tel:+34670254729"
              className="px-8 py-4 border border-white/20 text-white/70 font-body text-sm tracking-widest uppercase rounded-sm hover:border-gold/50 hover:text-white transition-all duration-200"
            >
              670 254 729
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
