'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe, Phone } from 'lucide-react'
import { locales } from '@/lib/locales'
import { localePath } from '@/lib/routes'
import { contact } from '@/lib/site'
import { Logo } from './Logo'

const localeLabels: Record<string, string> = {
  ca: 'CA',
  es: 'ES',
  en: 'EN',
}

export function Nav() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Without this the dropdown had no way to close except picking a language.
  useEffect(() => {
    if (!langOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [langOpen])

  // The current URL without its locale. During server rendering the pathname
  // can be the middleware's rewritten /ca/... form, so this normalises both.
  const segments = pathname.split('/')
  if ((locales as readonly string[]).includes(segments[1])) segments.splice(1, 1)
  const barePath = segments.join('/') || '/'
  const currentHref = localePath(locale, barePath)

  const switchLocale = (newLocale: string) => {
    // Re-prefix the way the middleware expects (no prefix for the default locale).
    const target = localePath(newLocale, barePath)
    setLangOpen(false)
    // A full document navigation, not router.push: when only the [locale]
    // segment changes the App Router serves the already-cached RSC payload, so
    // the URL and the language silently stayed put. This also lets the server
    // re-render <html lang> for the new locale.
    window.location.assign(target)
  }

  const bookHref = localePath(locale, '/book')

  const navItems = [
    { href: localePath(locale, '/'), label: t('home') },
    { href: localePath(locale, '/about'), label: t('about') },
    { href: localePath(locale, '/services'), label: t('services') },
    { href: localePath(locale, '/prices'), label: t('prices') },
    { href: localePath(locale, '/car'), label: t('car') },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen ? 'bg-paper/95 backdrop-blur border-b border-line' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={localePath(locale, '/')} className="flex items-center gap-3 group">
          <Logo className="w-9 h-9" />
          <span className="font-heading text-lg font-bold">Taxi Teià</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={currentHref === item.href ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors duration-200 whitespace-nowrap ${
                currentHref === item.href
                  ? 'bg-taxi text-ink font-bold'
                  : 'text-ink/75 hover:text-ink hover:bg-taxi/25'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Language switcher */}
          <div className="relative ml-2" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              aria-expanded={langOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 min-h-[44px] px-1 text-sm text-ink/70 hover:text-ink active:text-ink touch-manipulation transition-colors"
            >
              <Globe size={14} />
              <span className="font-body">
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
                  className="absolute top-11 right-0 bg-field border border-line shadow-lg shadow-ink/10 rounded-lg overflow-hidden min-w-[96px]"
                  role="menu"
                >
                  {Object.entries(localeLabels).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      role="menuitem"
                      onClick={() => switchLocale(code)}
                      className={`w-full min-h-[44px] px-4 text-sm text-left font-body hover:bg-taxi/25 active:bg-taxi/40 touch-manipulation transition-colors ${
                        code === locale ? 'text-ink font-bold' : 'text-ink/70'
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
            href={bookHref}
            className="ml-2 px-5 py-2 bg-ink text-paper text-sm font-body font-bold rounded-full hover:bg-ink/85 transition-colors duration-200"
          >
            {t('book')}
          </Link>
        </div>

        {/* Mobile: phone + burger. Both need a 44px box to be reliably tappable,
            so the icons sit inside padded hit areas rather than standing alone. */}
        <div className="flex md:hidden items-center -mr-2">
          <a
            href={`tel:${contact.phoneE164}`}
            className="w-11 h-11 flex items-center justify-center text-ink active:text-taxi-deep touch-manipulation"
            aria-label="Call"
          >
            <Phone size={20} />
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-11 h-11 flex items-center justify-center text-ink active:text-taxi-deep touch-manipulation"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
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
            className="md:hidden bg-paper border-b border-line"
          >
            <div className="px-6 py-4 flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center min-h-[52px] text-base font-body border-b border-line touch-manipulation ${
                    currentHref === item.href ? 'text-ink font-bold' : 'text-ink/75 active:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {/* Full-width equal thirds: the old pills were 47x34, well under the
                  44px minimum, which is why taps kept missing on a phone. */}
              <div className="flex gap-2 pt-5">
                {Object.entries(localeLabels).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { switchLocale(code); setMobileOpen(false) }}
                    aria-current={code === locale ? 'true' : undefined}
                    className={`flex-1 min-h-[48px] text-sm font-body border rounded-full touch-manipulation transition-colors ${
                      code === locale
                        ? 'border-ink text-ink font-bold bg-taxi'
                        : 'border-line text-ink/70 active:border-ink active:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Link
                href={bookHref}
                onClick={() => setMobileOpen(false)}
                className="mt-4 min-h-[52px] flex items-center justify-center px-5 bg-taxi text-ink text-base font-body font-bold rounded-full text-center touch-manipulation"
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
