'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { MessageCircle, Phone } from 'lucide-react'
import { localePath } from '@/lib/routes'
import { contact } from '@/lib/site'

export function Hero() {
  const t = useTranslations('hero')
  const locale = useLocale()

  return (
    <section className="lg:min-h-[100svh] flex items-center px-6 pt-28 pb-16">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-20 items-center">
        <div>
          <h1 className="font-heading font-bold text-6xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-7 max-w-xl text-lg md:text-xl text-ink/70 leading-relaxed">
            {t('subtitle')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href={localePath(locale, '/book')}
              className="inline-flex items-center justify-center min-h-[56px] px-8 bg-taxi text-on-taxi text-lg font-bold rounded-full hover:bg-taxi-light transition-colors"
            >
              {t('cta')}
            </Link>
            <Link
              href={localePath(locale, '/car')}
              className="inline-flex items-center justify-center min-h-[56px] px-8 border-2 border-ink/20 text-ink text-lg rounded-full hover:border-ink transition-colors"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>

        {/* The roof sign: calling is what most visitors come here to do. */}
        <div className="animate-fade-in flex flex-col items-center">
          <div
            className="w-44 h-11 bg-ink text-paper font-heading font-bold text-xl tracking-[0.35em] pl-[0.35em] flex items-center justify-center"
            style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)' }}
            aria-hidden="true"
          >
            TAXI
          </div>
          <div className="w-full bg-taxi rounded-[28px] p-6 sm:p-10 shadow-[0_24px_48px_-24px_rgb(var(--taxi-deep)/0.5)]">
            <p className="text-on-taxi/80 text-lg">{t('callUs')}</p>
            <a
              href={`tel:${contact.phoneE164}`}
              className="mt-1 flex items-center gap-3 text-on-taxi font-heading font-bold text-4xl sm:text-5xl xl:text-6xl tabular-nums tracking-tight hover:underline decoration-4 underline-offset-8"
            >
              <Phone strokeWidth={2.5} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" aria-hidden="true" />
              {contact.phone}
            </a>
            <div className="mt-8 pt-6 border-t-2 border-on-taxi/20 flex flex-wrap items-center justify-between gap-4">
              <a
                href={`https://wa.me/${contact.phoneE164.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-paper text-ink font-bold rounded-full hover:bg-paper/85 transition-colors"
              >
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp
              </a>
              <span className="text-on-taxi/80">
                {contact.town}, {contact.region}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
