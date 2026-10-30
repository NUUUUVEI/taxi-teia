'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')

type Labels = {
  hour: string
  minute: string
  hourUp: string
  hourDown: string
  minuteUp: string
  minuteDown: string
}

/**
 * 24-hour HH:MM picker in 5-minute steps: big digits with arrows, and each
 * half can be tapped and typed into. Disabled times (already past today) are
 * skipped by the arrows, and typed ones snap to the next time that's allowed.
 */
export function TimeClock({
  hour,
  minute,
  onChange,
  isDisabled,
  labels,
}: {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  isDisabled: (hour: number, minute: number) => boolean
  labels: Labels
}) {
  // Every selectable slot in order; the arrows walk this list.
  const slots: [number, number][] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) if (!isDisabled(h, m)) slots.push([h, m])
  }

  const nearest = (h: number, m: number): [number, number] | null => {
    const target = h * 60 + m
    return slots.find(([sh, sm]) => sh * 60 + sm >= target) ?? slots[slots.length - 1] ?? null
  }

  const set = (h: number, m: number) => {
    const slot = nearest(h, m)
    if (slot) onChange(slot[0], slot[1])
  }

  // Hours move by a whole hour, keeping the minutes where possible.
  const stepHour = (delta: number) => {
    const hours = Array.from(new Set(slots.map(([h]) => h)))
    const i = hours.indexOf(hour)
    const next = hours[(i + delta + hours.length) % hours.length]
    if (next === undefined) return
    const sameMinute = slots.find(([h, m]) => h === next && m === minute)
    set(next, sameMinute ? minute : 0)
  }

  const stepMinute = (delta: number) => {
    const i = slots.findIndex(([h, m]) => h === hour && m === minute)
    const next = slots[(i + delta + slots.length) % slots.length]
    if (next) onChange(next[0], next[1])
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4" role="group">
      <Digit
        value={hour}
        max={23}
        label={labels.hour}
        upLabel={labels.hourUp}
        downLabel={labels.hourDown}
        onStep={stepHour}
        onType={(h) => set(h, minute)}
      />
      <span className="font-heading font-bold text-6xl sm:text-7xl text-ink/40 pb-2" aria-hidden="true">
        :
      </span>
      <Digit
        value={minute}
        max={59}
        label={labels.minute}
        upLabel={labels.minuteUp}
        downLabel={labels.minuteDown}
        onStep={stepMinute}
        // Typed minutes round down to the 5-minute grid.
        onType={(m) => set(hour, m - (m % 5))}
      />
    </div>
  )
}

function Digit({
  value,
  max,
  label,
  upLabel,
  downLabel,
  onStep,
  onType,
}: {
  value: number
  max: number
  label: string
  upLabel: string
  downLabel: string
  onStep: (delta: number) => void
  onType: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  // A change from the arrows or the parent replaces whatever was half-typed.
  useEffect(() => setDraft(null), [value])

  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    setDraft(null)
    if (draft !== '' && Number.isFinite(n)) onType(Math.min(max, Math.max(0, n)))
  }

  const arrow =
    'w-full flex items-center justify-center h-12 rounded-xl text-ink/70 hover:bg-taxi/30 hover:text-ink active:bg-taxi/50 touch-manipulation transition-colors'

  return (
    <div className="flex flex-col items-center w-24 sm:w-28">
      <button type="button" onClick={() => onStep(1)} aria-label={upLabel} className={arrow}>
        <ChevronUp size={28} strokeWidth={2.5} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        aria-label={label}
        value={draft ?? pad(value)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1) }
          if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1) }
        }}
        className="w-full my-1 py-2 text-center font-heading font-bold text-6xl sm:text-7xl tabular-nums bg-field border-2 border-ink/15 rounded-2xl focus:outline-none focus:border-ink caret-transparent"
      />
      <button type="button" onClick={() => onStep(-1)} aria-label={downLabel} className={arrow}>
        <ChevronDown size={28} strokeWidth={2.5} />
      </button>
    </div>
  )
}
