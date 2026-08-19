'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full border border-gold flex items-center justify-center">
                <span className="text-gold font-heading font-bold text-sm">T</span>
              </div>
              <span className="font-heading text-xl font-semibold">
                Taxi <span className="text-gold">Teià</span>
              </span>
            </div>
            <p className="text-white/50 text-sm font-body leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-white/30 text-xs font-body mt-3">{t('license')}</p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-gold text-xs font-body tracking-[0.2em] uppercase mb-4">
              Navigation
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { href: `/${locale}`, label: tNav('home') },
                { href: `/${locale}/car`, label: tNav('car') },
                { href: `/${locale}/book`, label: tNav('book') },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/50 text-sm font-body hover:text-gold transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-gold text-xs font-body tracking-[0.2em] uppercase mb-4">
              {t('contact')}
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+34670254729"
                className="flex items-center gap-3 text-white/50 hover:text-gold transition-colors duration-200 text-sm font-body"
              >
                <Phone size={14} className="text-gold/60 flex-shrink-0" />
                {t('phone')}
              </a>
              <a
                href="https://wa.me/34670254729"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/50 hover:text-gold transition-colors duration-200 text-sm font-body"
              >
                <MessageCircle size={14} className="text-gold/60 flex-shrink-0" />
                {t('whatsapp')}
              </a>
              <a
                href="mailto:marctaxiteia@gmail.com"
                className="flex items-center gap-3 text-white/50 hover:text-gold transition-colors duration-200 text-sm font-body"
              >
                <Mail size={14} className="text-gold/60 flex-shrink-0" />
                {t('email')}
              </a>
              <div className="flex items-center gap-3 text-white/30 text-sm font-body">
                <MapPin size={14} className="text-gold/40 flex-shrink-0" />
                {t('location')}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs font-body">
            {t('rights', { year })}
          </p>
          <a
            href="https://wa.me/34670254729"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-body tracking-widest uppercase rounded-sm hover:bg-[#25D366]/20 transition-colors duration-200"
          >
            <MessageCircle size={12} />
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  )
}
