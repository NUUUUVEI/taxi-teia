import Link from 'next/link'
import { format } from 'date-fns'
import { getTranslations } from 'next-intl/server'
import { dateLocales } from '@/lib/dateLocale'
import { localePath } from '@/lib/routes'
import {
  business,
  contact,
  isPending,
  legalUpdatedAt,
  siteUrl,
} from '@/lib/site'

type Section = {
  title: string
  body: string
  items?: string[]
}

/** Renders one of the two legal documents from the translation files. */
export async function LegalArticle({
  locale,
  kind,
}: {
  locale: string
  kind: 'privacy' | 'notice'
}) {
  const t = await getTranslations({ locale, namespace: 'legal' })
  const tFooter = await getTranslations({ locale, namespace: 'footer' })
  const sections = t.raw(`${kind}.sections`) as Section[]

  const updated = format(legalUpdatedAt, 'd MMMM yyyy', {
    locale: dateLocales[locale] ?? dateLocales.ca,
  })

  const other =
    kind === 'privacy'
      ? { key: 'notice' as const, path: '/legal/notice' }
      : { key: 'privacy' as const, path: '/legal/privacy' }

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-gold text-xs font-body tracking-[0.25em] uppercase">
        {tFooter('legal')}
      </p>
      <h1 className="font-heading text-4xl md:text-5xl font-semibold mt-3">
        {t(`${kind}.title`)}
      </h1>
      <p className="text-white/60 font-body mt-5 leading-relaxed">
        {t(`${kind}.lead`)}
      </p>
      <p className="text-white/30 text-xs font-body mt-4">
        {t('updatedLabel')}: {updated}
      </p>

      <div className="mt-10 h-px bg-border" />

      {kind === 'notice' && <IdentityCard locale={locale} />}

      <div className="mt-12 flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-heading text-2xl font-semibold text-gold-300">
              {section.title}
            </h2>
            <p className="text-white/65 font-body mt-3 leading-relaxed">
              {section.body}
            </p>
            {section.items && (
              <ul className="mt-4 flex flex-col gap-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="text-white/55 font-body text-sm leading-relaxed pl-4 border-l border-gold/25"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-16 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href={localePath(locale, other.path)}
          className="text-gold text-sm font-body hover:text-gold-light transition-colors duration-200"
        >
          {tFooter(other.key)}
        </Link>
        <a
          href={`mailto:${contact.email}`}
          className="text-white/40 text-sm font-body hover:text-gold transition-colors duration-200"
        >
          {contact.email}
        </a>
      </div>
    </article>
  )
}

async function IdentityCard({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'legal.notice' })
  const tLegal = await getTranslations({ locale, namespace: 'legal' })

  const rows: { label: string; value: string; pending?: boolean }[] = [
    { label: t('fields.name'), value: business.legalName, pending: isPending(business.legalName) },
    { label: t('fields.taxId'), value: business.taxId, pending: isPending(business.taxId) },
    {
      label: t('fields.address'),
      value: business.registeredAddress,
      pending: isPending(business.registeredAddress),
    },
    {
      label: t('fields.licence'),
      value: business.taxiLicence,
      pending: isPending(business.taxiLicence),
    },
    { label: t('fields.phone'), value: contact.phone },
    { label: t('fields.email'), value: contact.email },
    { label: t('fields.site'), value: siteUrl.replace(/^https?:\/\//, '') },
  ]

  const anyPending = rows.some((row) => row.pending)

  return (
    <div className="mt-12 rounded-sm border border-border bg-card/60 p-6">
      <h2 className="text-gold text-xs font-body tracking-[0.2em] uppercase">
        {t('identityTitle')}
      </h2>
      <dl className="mt-5 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-white/40 font-body text-sm sm:w-56 shrink-0">
              {row.label}
            </dt>
            <dd
              className={`font-body text-sm ${
                row.pending ? 'text-gold-muted italic' : 'text-white/80'
              }`}
            >
              {row.pending ? tLegal('pending') : row.value}
            </dd>
          </div>
        ))}
      </dl>
      {anyPending && (
        <p className="mt-5 pt-4 border-t border-border text-white/35 font-body text-xs leading-relaxed">
          {tLegal('pendingNote')}
        </p>
      )}
    </div>
  )
}
