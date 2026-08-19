'use client'

import { useState, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfDay, addMinutes, parseISO } from 'date-fns'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, User, Phone, ChevronRight, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { PlaceInput } from './PlaceInput'
import type { Booking } from '@taxi-teia/db'

const BUFFER_MINUTES = 10

type FormData = {
  name: string
  phone: string
  pickup: string
  dropoff: string
  notes: string
}

type StepId = 'trip' | 'schedule' | 'details' | 'confirm'
const STEPS: StepId[] = ['trip', 'schedule', 'details', 'confirm']

type Feasibility =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'blocked'; reason: string }

function toStart(date: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

export function BookingPage() {
  const t = useTranslations('booking')

  const [step, setStep] = useState<StepId>('trip')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [feasibility, setFeasibility] = useState<Feasibility>({ status: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    pickup: '',
    dropoff: '',
    notes: '',
  })

  const estimateDuration = useCallback(async (pickup: string, dropoff: string) => {
    if (!pickup.trim() || !dropoff.trim()) return
    setEstimating(true)
    try {
      const res = await fetch('/api/duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: pickup, destination: dropoff }),
      })
      const data = await res.json()
      if (data?.duration_minutes) setEstimatedMinutes(data.duration_minutes)
    } catch {
      // estimation is best-effort
    } finally {
      setEstimating(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.pickup && form.dropoff) estimateDuration(form.pickup, form.dropoff)
      else setEstimatedMinutes(null)
    }, 600)
    return () => clearTimeout(timer)
  }, [form.pickup, form.dropoff, estimateDuration])

  const checkFeasibility = useCallback(async () => {
    if (!selectedDate || !selectedTime || !estimatedMinutes) {
      setFeasibility({ status: 'idle' })
      return
    }

    setFeasibility({ status: 'checking' })
    const newStart = toStart(selectedDate, selectedTime)
    const newEnd = addMinutes(newStart, estimatedMinutes)

    try {
      const day = format(selectedDate, 'yyyy-MM-dd')
      let existing: Pick<Booking, 'start_time' | 'estimated_minutes' | 'pickup_address' | 'dropoff_address'>[] = []

      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase
          .from('bookings')
          .select('start_time, estimated_minutes, pickup_address, dropoff_address')
          .gte('start_time', `${day}T00:00:00`)
          .lte('start_time', `${day}T23:59:59`)
          .not('status', 'eq', 'cancelled')
        existing = (data ?? []) as typeof existing
      }

      for (const trip of existing) {
        const tripStart = parseISO(trip.start_time)
        const tripEnd = addMinutes(tripStart, trip.estimated_minutes)

        const overlaps = newStart < tripEnd && tripStart < newEnd
        if (overlaps) {
          setFeasibility({
            status: 'blocked',
            reason: t('feasibility.overlap', {
              start: format(tripStart, 'HH:mm'),
              end: format(tripEnd, 'HH:mm'),
            }),
          })
          return
        }

        const earlierIsExisting = tripEnd <= newStart
        const origin = earlierIsExisting ? trip.dropoff_address : form.dropoff
        const dest = earlierIsExisting ? form.pickup : trip.pickup_address
        const gapStart = earlierIsExisting ? tripEnd : newEnd
        const gapEnd = earlierIsExisting ? newStart : tripStart

        const res = await fetch('/api/duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination: dest }),
        })
        const data = await res.json()
        const transferMin = (data.duration_minutes ?? 20) + BUFFER_MINUTES
        const needed = addMinutes(gapStart, transferMin)

        if (needed > gapEnd) {
          setFeasibility({
            status: 'blocked',
            reason: t('feasibility.transfer', {
              time: format(tripStart, 'HH:mm'),
              minutes: transferMin,
            }),
          })
          return
        }
      }

      setFeasibility({ status: 'ok' })
    } catch {
      setFeasibility({ status: 'ok' })
    }
  }, [selectedDate, selectedTime, estimatedMinutes, form.pickup, form.dropoff, t])

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkFeasibility()
    }, 400)
    return () => clearTimeout(timer)
  }, [checkFeasibility])

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return
    if (feasibility.status === 'blocked') return
    setSubmitting(true)
    setError('')

    const startTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.name,
          client_phone: form.phone,
          pickup_address: form.pickup,
          dropoff_address: form.dropoff,
          start_time: startTime,
          estimated_minutes: estimatedMinutes ?? 30,
          notes: form.notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('Booking API error:', data)
        setError(`${t('errors.generic')} (${data.error ?? res.status})`)
        return
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Booking submit error:', err)
      setError(t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-sm p-12 max-w-md text-center"
        >
          <CheckCircle2 size={48} className="text-gold mx-auto mb-6" />
          <h2 className="font-heading text-3xl text-white mb-3">{t('success.title')}</h2>
          <p className="text-white/60 font-body text-sm leading-relaxed">{t('success.message')}</p>
          <a
            href="tel:+34670254729"
            className="mt-8 inline-flex items-center gap-2 text-gold text-sm font-body tracking-widest uppercase"
          >
            670 254 729
          </a>
        </motion.div>
      </div>
    )
  }

  const stepIndex = STEPS.indexOf(step)
  const scheduleReady =
    !!selectedDate &&
    !!selectedTime &&
    feasibility.status !== 'blocked' &&
    feasibility.status !== 'checking'

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-gold text-xs font-body tracking-[0.3em] uppercase mb-3 block">
            Taxi Teià
          </span>
          <h1 className="font-heading font-light text-5xl md:text-6xl text-white mb-4">
            {t('title')}
          </h1>
          <div className="w-16 h-px bg-gold mx-auto mb-4" />
          <p className="text-white/50 font-body text-sm">{t('subtitle')}</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-semibold transition-all duration-300 ${
                  i < stepIndex
                    ? 'bg-gold text-black'
                    : i === stepIndex
                    ? 'border-2 border-gold text-gold'
                    : 'border border-white/20 text-white/30'
                }`}
              >
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < stepIndex ? 'bg-gold' : 'bg-white/15'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'trip' && (
              <div className="glass rounded-sm p-8 space-y-5">
                <h2 className="font-heading text-2xl text-white gold-line">{t('form.trip')}</h2>
                <PlaceInput
                  label={t('form.pickup')}
                  placeholder={t('form.pickupPlaceholder')}
                  value={form.pickup}
                  onChange={(pickup) => setForm({ ...form, pickup })}
                />
                <PlaceInput
                  label={t('form.dropoff')}
                  placeholder={t('form.dropoffPlaceholder')}
                  value={form.dropoff}
                  onChange={(dropoff) => setForm({ ...form, dropoff })}
                />

                <AnimatePresence>
                  {(estimating || estimatedMinutes !== null) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 px-4 py-3 bg-gold/5 border border-gold/20 rounded-sm"
                    >
                      <Clock size={14} className="text-gold flex-shrink-0" />
                      <span className="text-white/70 text-sm font-body">
                        {estimating ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            {t('form.estimating')}
                          </span>
                        ) : (
                          t('form.estimatedMinutes', { minutes: estimatedMinutes })
                        )}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStep('schedule')}
                    disabled={!form.pickup || !form.dropoff}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-light transition-colors"
                  >
                    {t('form.date')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'schedule' && (
              <div className="glass rounded-sm p-8">
                <h2 className="font-heading text-2xl text-white mb-6 gold-line">
                  {t('form.schedule')}
                </h2>
                <div className="flex justify-center mb-8">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: startOfDay(new Date()) }}
                    className="rdp-custom"
                    classNames={{
                      root: 'font-body',
                      month: 'space-y-4',
                      caption: 'flex justify-center relative items-center mb-4',
                      caption_label: 'text-white font-heading text-lg',
                      nav: 'flex items-center gap-1',
                      nav_button: 'text-gold/60 hover:text-gold transition-colors p-1',
                      table: 'w-full border-collapse',
                      head_row: 'flex',
                      head_cell:
                        'text-white/30 rounded-sm w-10 font-normal text-xs text-center uppercase tracking-widest',
                      row: 'flex w-full mt-2',
                      cell: 'text-center text-sm p-0',
                      day: 'h-10 w-10 p-0 font-normal text-white/70 hover:bg-gold/10 hover:text-gold rounded-sm transition-colors duration-150 cursor-pointer mx-auto block',
                      day_selected: 'bg-gold text-black font-semibold hover:bg-gold-light',
                      day_today: 'text-gold font-semibold',
                      day_disabled:
                        'text-white/20 cursor-not-allowed hover:bg-transparent hover:text-white/20',
                      day_outside: 'text-white/15',
                    }}
                  />
                </div>

                <label className="text-white/40 text-xs font-body tracking-widest uppercase mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-gold/60" />
                  {t('form.time')}
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full sm:w-56 bg-black/40 border border-white/10 text-white font-body text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-gold/50"
                />
                <p className="text-white/35 text-xs font-body mt-2">{t('form.timeHint')}</p>

                {estimatedMinutes !== null && (
                  <p className="text-white/50 text-sm font-body mt-4">
                    {t('form.estimatedMinutes', { minutes: estimatedMinutes })}
                  </p>
                )}

                {feasibility.status === 'checking' && (
                  <p className="mt-4 flex items-center gap-2 text-white/50 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    {t('feasibility.checking')}
                  </p>
                )}
                {feasibility.status === 'ok' && selectedTime && (
                  <p className="mt-4 text-emerald-400 text-sm font-body">{t('feasibility.ok')}</p>
                )}
                {feasibility.status === 'blocked' && (
                  <p className="mt-4 flex items-start gap-2 text-amber-400 text-sm font-body">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    {feasibility.reason}
                  </p>
                )}

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setStep('trip')}
                    className="text-white/40 hover:text-white text-sm font-body tracking-widest uppercase"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={() => setStep('details')}
                    disabled={!scheduleReady}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-light transition-colors"
                  >
                    {t('form.details')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="glass rounded-sm p-8 space-y-5">
                <h2 className="font-heading text-2xl text-white gold-line">{t('form.details')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    icon={<User size={14} />}
                    label={t('form.name')}
                    placeholder={t('form.namePlaceholder')}
                    value={form.name}
                    onChange={(name) => setForm({ ...form, name })}
                  />
                  <InputField
                    icon={<Phone size={14} />}
                    label={t('form.phone')}
                    placeholder={t('form.phonePlaceholder')}
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                    type="tel"
                  />
                </div>
                <InputField
                  label={t('form.notes')}
                  placeholder={t('form.notesPlaceholder')}
                  value={form.notes}
                  onChange={(notes) => setForm({ ...form, notes })}
                  multiline
                />
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('schedule')}
                    className="text-white/40 hover:text-white text-sm font-body tracking-widest uppercase"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!form.name || !form.phone}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-light"
                  >
                    {t('form.review')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="glass rounded-sm p-8">
                <h2 className="font-heading text-2xl text-white mb-6 gold-line">
                  {t('form.submit')}
                </h2>
                <div className="space-y-3 mb-8">
                  {[
                    { label: t('form.pickup'), value: form.pickup },
                    { label: t('form.dropoff'), value: form.dropoff },
                    {
                      label: t('form.date'),
                      value: selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : '',
                    },
                    { label: t('form.time'), value: selectedTime },
                    { label: t('form.name'), value: form.name },
                    { label: t('form.phone'), value: form.phone },
                    ...(estimatedMinutes
                      ? [{ label: t('form.estimatedTime'), value: `~${estimatedMinutes} min` }]
                      : []),
                    ...(form.notes ? [{ label: t('form.notes'), value: form.notes }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/40 text-sm font-body">{label}</span>
                      <span className="text-white text-sm font-body text-right max-w-[60%]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                {error && <p className="text-red-400 text-sm font-body mb-4">{error}</p>}
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep('details')}
                    className="text-white/40 hover:text-white text-sm font-body tracking-widest uppercase"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || feasibility.status === 'blocked'}
                    className="flex items-center gap-2 px-8 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-60 hover:bg-gold-light"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t('form.submitting')}
                      </>
                    ) : (
                      t('form.submit')
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  icon,
  type = 'text',
  multiline = false,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  icon?: React.ReactNode
  type?: string
  multiline?: boolean
}) {
  const base =
    'w-full bg-black/40 border border-white/10 text-white font-body text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/25'

  return (
    <div>
      <label className="text-white/40 text-xs font-body tracking-widest uppercase mb-2 flex items-center gap-1.5">
        {icon && <span className="text-gold/60">{icon}</span>}
        {label}
      </label>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </div>
  )
}
