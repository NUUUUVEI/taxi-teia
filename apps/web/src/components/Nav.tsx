'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe, Phone } from 'lucide-react'

const localeLabels: Record<string, string> = {
  ca: 'CA',
  es: 'ES',
  en: 'EN',
}

export function Nav() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const switchLocale = (newLocale: string) => {
    // Strip current locale prefix and replace
    const segments = pathname.split('/')
    const knownLocales = ['ca', 'es', 'en']
    if (knownLocales.includes(segments[1])) {
      segments[1] = newLocale
    } else {
      segments.splice(1, 0, newLocale)
    }
    router.push(segments.join('/') || '/')
    setLangOpen(false)
  }

  const navItems = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/car`, label: t('car') },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-lg shadow-black/40' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full border border-gold flex items-center justify-center">
            <span className="text-gold font-heading font-bold text-sm">T</span>
          </div>
          <span className="font-heading text-lg font-semibold tracking-wide">
            Taxi <span className="text-gold">Teià</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-body tracking-widest uppercase transition-colors duration-200 ${
                pathname === item.href
                  ? 'text-gold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              <Globe size={14} />
              <span className="font-body tracking-widest uppercase">
                {localeLabels[locale]}
              </span>
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-8 right-0 glass rounded-lg overflow-hidden min-w-[80px]"
                >
                  {Object.entries(localeLabels).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => switchLocale(code)}
                      className={`w-full px-4 py-2 text-sm text-left font-body tracking-widest uppercase hover:bg-gold/10 transition-colors ${
                        code === locale ? 'text-gold' : 'text-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Book CTA */}
          <Link
            href={`/${locale}/book`}
            className="px-5 py-2 bg-gold text-black text-sm font-body font-semibold tracking-widest uppercase rounded-sm hover:bg-gold-light transition-colors duration-200"
          >
            {t('book')}
          </Link>
        </div>

        {/* Mobile: phone + burger */}
        <div className="flex md:hidden items-center gap-4">
          <a
            href="tel:+34670254729"
            className="text-gold"
            aria-label="Call"
          >
            <Phone size={20} />
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass border-t border-gold/10"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-base font-body tracking-widest uppercase py-2 border-b border-white/5 ${
                    pathname === item.href ? 'text-gold' : 'text-white/70'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-2">
                {Object.entries(localeLabels).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => { switchLocale(code); setMobileOpen(false) }}
                    className={`text-sm font-body tracking-widest uppercase px-3 py-1.5 border rounded-sm transition-colors ${
                      code === locale
                        ? 'border-gold text-gold'
                        : 'border-white/20 text-white/50 hover:border-gold/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Link
                href={`/${locale}/book`}
                onClick={() => setMobileOpen(false)}
                className="mt-2 px-5 py-3 bg-gold text-black text-sm font-body font-semibold tracking-widest uppercase rounded-sm text-center"
              >
                {t('book')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
