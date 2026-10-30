'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import { localePath } from '@/lib/routes'
import { Logo } from './Logo'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-panel border-t border-line">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Logo className="w-10 h-10" />
              <span className="font-heading text-xl font-bold">Taxi Teià</span>
            </div>
            <p className="text-ink/70 text-sm font-body leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-ink/70 text-xs font-body mt-3">{t('license')}</p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-heading font-bold text-base mb-4">
              {tNav('navigation')}
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { href: localePath(locale, '/'), label: tNav('home') },
                { href: localePath(locale, '/about'), label: tNav('about') },
                { href: localePath(locale, '/services'), label: tNav('services') },
                { href: localePath(locale, '/prices'), label: tNav('prices') },
                { href: localePath(locale, '/car'), label: tNav('car') },
                { href: localePath(locale, '/book'), label: tNav('book') },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-ink/70 text-sm font-body hover:text-taxi-deep transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-bold text-base mb-4">
              {t('contact')}
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+34670254729"
                className="flex items-center gap-3 text-ink/70 hover:text-taxi-deep transition-colors duration-200 text-sm font-body"
              >
                <Phone size={14} className="text-taxi-deep flex-shrink-0" />
                {t('phone')}
              </a>
              <a
                href="https://wa.me/34670254729"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ink/70 hover:text-taxi-deep transition-colors duration-200 text-sm font-body"
              >
                <MessageCircle size={14} className="text-taxi-deep flex-shrink-0" />
                {t('whatsapp')}
              </a>
              <a
                href="mailto:marctaxiteia@gmail.com"
                className="flex items-center gap-3 text-ink/70 hover:text-taxi-deep transition-colors duration-200 text-sm font-body"
              >
                <Mail size={14} className="text-taxi-deep flex-shrink-0" />
                {t('email')}
              </a>
              <div className="flex items-center gap-3 text-ink/70 text-sm font-body">
                <MapPin size={14} className="text-taxi-deep flex-shrink-0" />
                {t('location')}
              </div>
            </div>

            <h3 className="font-heading font-bold text-base mt-8 mb-4">
              {t('legal')}
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                href={localePath(locale, '/legal/privacy')}
                className="text-ink/70 text-sm font-body hover:text-taxi-deep transition-colors duration-200"
              >
                {t('privacy')}
              </Link>
              <Link
                href={localePath(locale, '/legal/notice')}
                className="text-ink/70 text-sm font-body hover:text-taxi-deep transition-colors duration-200"
              >
                {t('notice')}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-ink/70 text-xs font-body">
            {t('rights', { year })}
          </p>
          <a
            href="https://wa.me/34670254729"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/15 border border-[#25D366]/40 text-[#0E6B3A] text-sm font-body rounded-full hover:bg-[#25D366]/25 transition-colors duration-200"
          >
            <MessageCircle size={12} />
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  )
}
