'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { CarGallery } from './CarGallery'

export function CarPageClient() {
  const t = useTranslations('car')

  return (
    <div>
      <div className="relative min-h-[40vh] flex flex-col items-center justify-center pt-24 pb-8 px-6 text-center">
        <h1 className="font-heading font-bold text-5xl md:text-7xl text-ink mb-4 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-ink/75 text-lg font-body max-w-lg">{t('subtitle')}</p>
        <p className="mt-2 text-ink/70 font-body">Toyota Corolla Touring Sports Hybrid 140</p>

        <div className="mt-10 flex flex-col items-center gap-2 text-ink/70">
          <p className="text-xs font-body">
            {t('scrollHint')}
          </p>
          <ChevronDown size={16} className="animate-bounce text-taxi-deep" />
        </div>
      </div>

      <CarGallery />
    </div>
  )
}
