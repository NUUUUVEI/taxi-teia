'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { CarGallery } from './CarGallery'

export function CarPageClient() {
  const t = useTranslations('car')

  return (
    <div>
      <div className="relative min-h-[40vh] flex flex-col items-center justify-center pt-24 pb-8 px-6 text-center">
        <span className="text-gold text-xs font-body tracking-[0.3em] uppercase mb-4 block">
          Toyota Corolla Touring Sports Hybrid 140
        </span>
        <h1 className="font-heading font-light text-5xl md:text-7xl text-white mb-4">
          {t('title')}
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-6" />
        <p className="text-white/50 text-lg font-body max-w-lg">{t('subtitle')}</p>

        <div className="mt-10 flex flex-col items-center gap-2 text-white/30">
          <p className="text-xs font-body tracking-widest uppercase">
            {t('scrollHint')}
          </p>
          <ChevronDown size={16} className="animate-bounce text-gold/40" />
        </div>
      </div>

      <CarGallery />
    </div>
  )
}
