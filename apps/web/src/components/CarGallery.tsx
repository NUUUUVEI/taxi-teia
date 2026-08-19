'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'

const SECTIONS = [
  { key: 'overview', image: '/images/car/overview.png' },
  { key: 'trunk', image: '/images/car/trunk.png' },
  { key: 'doors', image: '/images/car/doors.png' },
  { key: 'hood', image: '/images/car/engine.png' },
] as const

export function CarGallery() {
  const t = useTranslations('car.sections')
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.min(Math.max(-rect.top, 0), total)
      const p = total > 0 ? scrolled / total : 0
      setProgress(p)
      setActive(Math.min(Math.floor(p * SECTIONS.length), SECTIONS.length - 1))
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const section = SECTIONS[active]

  return (
    <div
      ref={containerRef}
      style={{ height: `${SECTIONS.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {SECTIONS.map((item, i) => {
          const isActive = i === active
          return (
            <motion.img
              key={item.key}
              src={item.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1.06 : 1.12,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          )
        })}

        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-3">
          {SECTIONS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i === active ? 'w-2 h-7 bg-gold' : 'w-1.5 h-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>

        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
          <span className="text-gold/70 text-xs font-body tracking-[0.3em] uppercase">
            {String(active + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45 }}
            className="absolute bottom-16 left-6 right-6 md:left-auto md:right-16 md:max-w-sm z-20"
          >
            <div className="glass rounded-sm p-6">
              <div className="w-8 h-px bg-gold mb-4" />
              <h3 className="font-heading text-2xl md:text-3xl text-white mb-2">
                {t(`${section.key}.title`)}
              </h3>
              <p className="text-white/65 text-sm font-body leading-relaxed">
                {t(`${section.key}.description`)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10">
          <div
            className="h-full bg-gold transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
