'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useLocale } from 'next-intl'

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
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
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
        setSuggestions(data.predictions ?? [])
        setOpen(true)
      } catch {
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
      <label className="text-white/40 text-xs font-body tracking-widest uppercase mb-2 flex items-center gap-1.5">
        <span className="text-gold/60">
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
          className="w-full bg-black/40 border border-white/10 text-white font-body text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/25"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gold/70"
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-auto bg-[#141414] border border-gold/20 rounded-sm shadow-2xl">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.description)
                  setSuggestions([])
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gold/10 transition-colors border-b border-white/5 last:border-0"
              >
                <span className="block text-white text-sm font-body">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="block text-white/40 text-xs font-body mt-0.5">
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
