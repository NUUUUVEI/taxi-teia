'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera } from 'lucide-react'

/**
 * Drop the four photos into `apps/web/public/images/car/` using these names.
 * Either .png or .jpg works — the gallery tries .png first, then .jpg.
 */
const SECTIONS = [
  { key: 'overview', file: 'overview' },
  { key: 'trunk', file: 'trunk' },
  { key: 'doors', file: 'doors' },
  { key: 'hood', file: 'engine' },
] as const

type Status = 'png' | 'jpg' | 'missing'

export function CarGallery() {
  const t = useTranslations('car.sections')
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<Record<string, Status>>({})

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
  const allMissing = SECTIONS.every(s => status[s.key] === 'missing')

  return (
    <div ref={containerRef} style={{ height: `${SECTIONS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {SECTIONS.map((item, i) => {
          const state = status[item.key] ?? 'png'
          if (state === 'missing') return null

          return (
            <motion.img
              key={item.key}
              src={`/images/car/${item.file}.${state}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={false}
              animate={{
                opacity: i === active ? 1 : 0,
                scale: i === active ? 1.06 : 1.12,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              onError={() =>
                setStatus(prev => ({
                  ...prev,
                  [item.key]: prev[item.key] === 'jpg' ? 'missing' : 'jpg',
                }))
              }
            />
          )
        })}

        {/* Stand-in backdrop while the real photos aren't in place yet */}
        {allMissing && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#141414] via-black to-[#0d0d0d]">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/15">
              <Camera size={40} strokeWidth={1} />
              <span className="text-xs font-body tracking-[0.25em] uppercase">
                Toyota Corolla Touring Sports
              </span>
            </div>
          </div>
        )}

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
