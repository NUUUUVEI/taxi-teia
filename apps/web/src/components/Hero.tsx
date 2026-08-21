'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Phone, MessageCircle, ChevronDown } from 'lucide-react'
import { ParticleCanvas } from './ParticleCanvas'
import { localePath } from '@/lib/routes'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export function Hero() {
  const t = useTranslations('hero')
  const locale = useLocale()

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Particle background */}
      <ParticleCanvas />

      {/* Dark overlay with vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />

      {/* Golden horizontal line decorations */}
      <div className="absolute top-1/3 left-0 w-24 h-px bg-gradient-to-r from-transparent to-gold/40" />
      <div className="absolute top-1/3 right-0 w-24 h-px bg-gradient-to-l from-transparent to-gold/40" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="inline-flex items-center gap-2 px-4 py-1.5 border border-gold/30 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="text-gold/80 text-xs font-body tracking-[0.2em] uppercase">
            {t('badge')}
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="font-heading font-light text-6xl md:text-8xl lg:text-9xl mb-6 leading-none tracking-tight"
        >
          {t('title').split(' ').map((word, i) => (
            <span
              key={i}
              className={i === 1 ? 'text-gold-gradient italic' : 'text-white'}
            >
              {word}{' '}
            </span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.35}
          className="text-white/60 text-lg md:text-xl font-body font-light max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          {t('subtitle')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.5}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href={localePath(locale, '/book')}
            className="group flex items-center gap-3 px-8 py-4 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-gold-light transition-all duration-300 animate-pulse-gold"
          >
            {t('cta')}
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>

          <Link
            href={localePath(locale, '/car')}
            className="flex items-center gap-3 px-8 py-4 border border-white/20 text-white/80 font-body text-sm tracking-widest uppercase rounded-sm hover:border-gold/50 hover:text-white transition-all duration-300"
          >
            {t('ctaSecondary')}
          </Link>
        </motion.div>

        {/* Contact strip */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.65}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <a
            href="tel:+34670254729"
            className="flex items-center gap-2 text-white/50 hover:text-gold transition-colors duration-200 font-body text-sm"
          >
            <Phone size={14} className="text-gold" />
            <span className="tracking-widest">{t('phone')}</span>
          </a>
          <div className="w-px h-4 bg-white/20 hidden sm:block" />
          <a
            href="https://wa.me/34670254729"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/50 hover:text-gold transition-colors duration-200 font-body text-sm"
          >
            <MessageCircle size={14} className="text-gold" />
            <span className="tracking-widest">WhatsApp</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/40" />
        <ChevronDown size={16} className="text-gold/40 animate-bounce" />
      </motion.div>
    </section>
  )
}
