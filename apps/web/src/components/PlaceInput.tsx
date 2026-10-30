'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

type Suggestion = {
  description: string
  placeId: string
  mainText: string
  secondaryText: string
}

export function PlaceInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  const locale = useLocale()
  const t = useTranslations('booking.form')
  const [open, setOpen] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  // The text a suggestion filled in; searching for it again would just reopen
  // the list with that same suggestion.
  const picked = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2 || value === picked.current) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/places?q=${encodeURIComponent(q)}&language=${locale}`
        )
        const data = await res.json()
        setUnavailable(!res.ok)
        setSuggestions(data.predictions ?? [])
        setOpen(true)
      } catch {
        setUnavailable(true)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [value, locale])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <label className="text-ink/80 text-sm font-bold font-body mb-2 flex items-center gap-1.5">
        <span className="text-taxi-deep">
          <MapPin size={14} />
        </span>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-field border border-ink/20 text-ink font-body text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-taxi-deep transition-colors placeholder:text-ink/50"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-taxi-deep"
          />
        )}
      </div>

      {unavailable && (
        <p className="text-ink/65 text-xs font-body mt-2">{t('suggestionsUnavailable')}</p>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-auto bg-field border border-line rounded-lg shadow-lg shadow-ink/10">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => {
                  picked.current = s.description
                  onChange(s.description)
                  setSuggestions([])
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-taxi/10 transition-colors border-b border-ink/5 last:border-0"
              >
                <span className="block text-ink text-sm font-body">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="block text-ink/65 text-xs font-body mt-0.5">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
