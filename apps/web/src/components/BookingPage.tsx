'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfDay, addMinutes, subMinutes, parseISO, isSameDay } from 'date-fns'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, User, Phone, ChevronRight, CheckCircle2, Loader2, AlertTriangle, MapPin,
  Plane, Users, Briefcase, Minus, Plus, ChevronDown, X,
} from 'lucide-react'
import { PlaceInput } from './PlaceInput'
import { RouteMap } from './RouteMap'
import { dateLocales } from '@/lib/dateLocale'
import { MAX_LUGGAGE, MAX_PASSENGERS } from '@/lib/types'
import type { Availability } from '@/lib/server/availability'

/**
 * Enough to catch the airports people actually fly from here without matching
 * ordinary street names — deliberately no bare "BCN" or terminal codes.
 */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const AIRPORT_HINTS = [
  'aeroport',
  'aeropuerto',
  'airport',
  'el prat',
  'josep tarradellas',
  'costa brava',
  'reus',
]

type FormData = {
  name: string
  phone: string
  email: string
  pickup: string
  dropoff: string
  notes: string
}

type StepId = 'schedule' | 'trip' | 'details' | 'confirm'
const STEPS: StepId[] = ['schedule', 'trip', 'details', 'confirm']

type TimeMode = 'pickup' | 'arrival'

type RouteInfo = {
  duration_minutes: number
  distance_km: number
  polyline: string | null
}

/** Used when no route can be calculated; distance 0 marks it as a guess. */
const FALLBACK_ROUTE: RouteInfo = { duration_minutes: 30, distance_km: 0, polyline: null }

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

async function fetchRoute(
  origin: string,
  destination: string,
  departureTime?: number
): Promise<RouteInfo | null> {
  const res = await fetch('/api/duration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      departure_time: departureTime,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.duration_minutes) return null
  return {
    duration_minutes: data.duration_minutes,
    distance_km: data.distance_km ?? 0,
    polyline: data.polyline ?? null,
  }
}

async function solvePickupFromArrival(
  pickup: string,
  dropoff: string,
  arrival: Date
): Promise<{ pickupTime: Date; route: RouteInfo }> {
  let minutes = 30
  let pickupTime = subMinutes(arrival, minutes)

  for (let i = 0; i < 5; i++) {
    const dep = Math.floor(pickupTime.getTime() / 1000)
    const route = await fetchRoute(pickup, dropoff, dep)
    if (!route) break
    minutes = route.duration_minutes
    const nextPickup = subMinutes(arrival, minutes)
    if (Math.abs(nextPickup.getTime() - pickupTime.getTime()) < 60_000) {
      return { pickupTime: nextPickup, route }
    }
    pickupTime = nextPickup
  }

  const fallback = await fetchRoute(pickup, dropoff, Math.floor(pickupTime.getTime() / 1000))
  return {
    pickupTime,
    route: fallback ?? { ...FALLBACK_ROUTE, duration_minutes: minutes },
  }
}

export function BookingPage() {
  const t = useTranslations('booking')
  const locale = useLocale()
  const dfLocale = dateLocales[locale] ?? dateLocales.ca

  const [step, setStep] = useState<StepId>('schedule')
  const [timeMode, setTimeMode] = useState<TimeMode>('pickup')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('00')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [pickupTime, setPickupTime] = useState<Date | null>(null)
  const [arrivalTime, setArrivalTime] = useState<Date | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [feasibility, setFeasibility] = useState<Feasibility>({ status: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [luggage, setLuggage] = useState(0)
  const [flight, setFlight] = useState('')
  const [website, setWebsite] = useState('')
  // null = follow the address sniffing; true/false = the visitor decided.
  const [flightOverride, setFlightOverride] = useState<boolean | null>(null)

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    pickup: '',
    dropoff: '',
    notes: '',
  })

  const selectedTime = hour === '' ? '' : `${hour}:${minute}`

  const requestedTime = useMemo(() => {
    if (!selectedDate || !selectedTime) return null
    return toStart(selectedDate, selectedTime)
  }, [selectedDate, selectedTime])

  // Times already gone are greyed out rather than letting someone pick one and
  // only find out from the feasibility check afterwards.
  const now = new Date()
  const isToday = selectedDate ? isSameDay(selectedDate, now) : false
  const hourDisabled = (h: string) => isToday && Number(h) < now.getHours()
  const minuteDisabled = (m: string) =>
    isToday && hour !== '' && Number(hour) === now.getHours() && Number(m) <= now.getMinutes()

  const pickHour = (h: string) => {
    setHour(h)
    if (isToday && Number(h) === now.getHours()) {
      setMinute(MINUTES.find((m) => Number(m) > now.getMinutes()) ?? '00')
    }
  }

  // Changing the date can strand a time in the past; drop it if so.
  useEffect(() => {
    if (!selectedDate || hour === '') return
    if (toStart(selectedDate, `${hour}:${minute}`) <= new Date()) setHour('')
  }, [selectedDate, hour, minute])

  const looksLikeAirport = useMemo(() => {
    const haystack = `${form.pickup} ${form.dropoff}`.toLowerCase()
    return AIRPORT_HINTS.some((hint) => haystack.includes(hint))
  }, [form.pickup, form.dropoff])

  const showFlight = flightOverride ?? looksLikeAirport
  const tightFit = passengers >= MAX_PASSENGERS && luggage >= 4

  const hideFlight = () => {
    setFlightOverride(false)
    setFlight('')
  }

  const fmtTime = useCallback(
    (d: Date) => format(d, 'HH:mm', { locale: dfLocale }),
    [dfLocale]
  )

  const fmtDate = useCallback(
    (d: Date) => format(d, 'EEEE, d MMMM yyyy', { locale: dfLocale }),
    [dfLocale]
  )

  // Recalculate route + pickup/arrival when trip addresses or schedule change
  useEffect(() => {
    if (!form.pickup.trim() || !form.dropoff.trim() || !requestedTime) {
      setRouteInfo(null)
      setPickupTime(null)
      setArrivalTime(null)
      return
    }

    const timer = setTimeout(async () => {
      setEstimating(true)
      try {
        if (timeMode === 'pickup') {
          const dep = Math.floor(requestedTime.getTime() / 1000)
          // Without a route (Google down, unknown address) fall back to a
          // rough estimate rather than leaving the visitor stuck: Marc checks
          // and confirms every request anyway.
          const route = (await fetchRoute(form.pickup, form.dropoff, dep)) ?? FALLBACK_ROUTE
          setRouteInfo(route)
          setPickupTime(requestedTime)
          setArrivalTime(addMinutes(requestedTime, route.duration_minutes))
        } else {
          const { pickupTime: pt, route } = await solvePickupFromArrival(
            form.pickup,
            form.dropoff,
            requestedTime
          )
          setRouteInfo(route)
          setPickupTime(pt)
          setArrivalTime(requestedTime)
        }
      } finally {
        setEstimating(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [form.pickup, form.dropoff, requestedTime, timeMode])

  const toFeasibility = useCallback(
    (a: Availability): Feasibility => {
      if (a.status !== 'blocked') return { status: 'ok' }
      switch (a.reason) {
        case 'past':
          return { status: 'blocked', reason: t('feasibility.past') }
        case 'overlap':
          return {
            status: 'blocked',
            reason: t('feasibility.overlap', {
              start: fmtTime(parseISO(a.start)),
              end: fmtTime(parseISO(a.end)),
            }),
          }
        case 'transfer':
          return {
            status: 'blocked',
            reason: t('feasibility.transfer', {
              time: fmtTime(parseISO(a.time)),
              minutes: a.minutes,
            }),
          }
        case 'driverTooFar':
          return {
            status: 'blocked',
            reason: t('feasibility.driverTooFar', { minutes: a.minutes }),
          }
      }
    },
    [t, fmtTime]
  )

  const checkFeasibility = useCallback(async () => {
    if (!pickupTime || !routeInfo || !form.pickup || !form.dropoff) {
      setFeasibility({ status: 'idle' })
      return
    }

    if (pickupTime <= new Date()) {
      setFeasibility({ status: 'blocked', reason: t('feasibility.past') })
      return
    }

    setFeasibility({ status: 'checking' })

    // Other bookings and the driver's position are private, so the server
    // runs the check and only tells us whether the slot fits.
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: form.pickup,
          dropoff: form.dropoff,
          start_time: pickupTime.toISOString(),
          estimated_minutes: routeInfo.duration_minutes,
        }),
      })
      setFeasibility(res.ok ? toFeasibility(await res.json()) : { status: 'ok' })
    } catch {
      setFeasibility({ status: 'ok' })
    }
  }, [pickupTime, routeInfo, form.pickup, form.dropoff, t, toFeasibility])

  useEffect(() => {
    const timer = setTimeout(() => void checkFeasibility(), 400)
    return () => clearTimeout(timer)
  }, [checkFeasibility])

  const handleSubmit = async () => {
    if (!pickupTime || !requestedTime) return
    if (feasibility.status === 'blocked') return
    setSubmitting(true)
    setError('')

    const startTime = pickupTime.toISOString()

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.name,
          client_phone: form.phone,
          client_email: form.email || null,
          pickup_address: form.pickup,
          dropoff_address: form.dropoff,
          start_time: startTime,
          requested_time: requestedTime.toISOString(),
          time_mode: timeMode,
          locale,
          estimated_minutes: routeInfo?.duration_minutes ?? 30,
          notes: form.notes || null,
          flight_number: flight.trim() || null,
          passengers,
          luggage,
          website,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Someone else may have taken the slot since the form last checked.
        const blocked = data.error === 'unavailable' && data.availability
          ? toFeasibility(data.availability)
          : null
        if (blocked?.status === 'blocked') {
          setFeasibility(blocked)
          setError(blocked.reason)
          return
        }
        setError(
          data.error === 'too_many'
            ? t('errors.tooMany')
            : data.error === 'invalid_phone'
              ? t('errors.invalidPhone')
              : t('errors.generic')
        )
        return
      }

      setSubmitted(true)
    } catch {
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
          className="panel rounded-2xl p-12 max-w-md text-center"
        >
          <CheckCircle2 size={48} className="text-taxi-deep mx-auto mb-6" />
          <h2 className="font-heading font-bold text-3xl text-ink mb-3">{t('success.title')}</h2>
          <p className="text-ink/70 font-body text-sm leading-relaxed">{t('success.message')}</p>
          {pickupTime && (
            <p className="text-taxi-deep font-body text-sm mt-4">
              {timeMode === 'pickup'
                ? t('success.requestedPickup', { time: fmtTime(pickupTime) })
                : t('success.requestedArrival', { time: fmtTime(arrivalTime!) })}
            </p>
          )}
          <a
            href="tel:+34670254729"
            className="mt-8 inline-flex items-center gap-2 min-h-[48px] px-6 bg-taxi text-ink font-bold rounded-full"
          >
            670 254 729
          </a>
        </motion.div>
      </div>
    )
  }

  const stepIndex = STEPS.indexOf(step)
  const scheduleReady = !!selectedDate && !!selectedTime
  const tripReady =
    !!form.pickup &&
    !!form.dropoff &&
    !!routeInfo &&
    feasibility.status !== 'blocked' &&
    feasibility.status !== 'checking'

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-5xl md:text-6xl text-ink mb-4">
            {t('title')}
          </h1>
          <p className="text-ink/70 font-body text-sm">{t('subtitle')}</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-semibold transition-all duration-300 ${
                  i < stepIndex
                    ? 'bg-taxi text-ink'
                    : i === stepIndex
                    ? 'border-2 border-taxi-deep text-taxi-deep'
                    : 'border border-ink/20 text-ink/55'
                }`}
              >
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < stepIndex ? 'bg-taxi' : 'bg-ink/15'}`} />
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
            {/* ── STEP 1: Schedule ── */}
            {step === 'schedule' && (
              <div className="panel rounded-2xl p-5 sm:p-8">
                <h2 className="font-heading font-bold text-2xl text-ink mb-6 taxi-rule">
                  {t('form.schedule')}
                </h2>

                {/* Not a centring flex wrapper: the day grid divides the table
                    width between its cells, so the table has to stretch. */}
                <div className="mb-8">
                  <DayPicker
                    mode="single"
                    locale={dfLocale}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: startOfDay(new Date()) }}
                    className="rdp-custom w-full"
                    classNames={{
                      root: 'font-body w-full',
                      month: 'space-y-4 w-full',
                      caption: 'flex justify-center relative items-center mb-4',
                      caption_label: 'text-ink font-heading font-bold text-lg capitalize',
                      nav: 'flex items-center gap-2',
                      nav_button:
                        'w-11 h-11 flex items-center justify-center text-taxi-deep hover:text-taxi-deep active:text-taxi-deep touch-manipulation transition-colors',
                      table: 'w-full border-collapse',
                      head_row: 'flex',
                      head_cell:
                        'flex-1 text-ink/55 rounded-sm font-normal text-xs text-center',
                      row: 'flex w-full mt-1',
                      cell: 'flex-1 text-center text-sm p-0',
                      // Fluid width with a fixed 44px height: the row divides the
                      // available space so the grid never overflows a narrow
                      // phone, while staying tall enough to tap accurately.
                      day: 'h-11 w-full max-w-[44px] p-0 font-normal text-ink/70 hover:bg-taxi/30 hover:text-ink active:bg-taxi/50 rounded-lg transition-colors duration-150 cursor-pointer mx-auto block touch-manipulation',
                      day_selected: 'bg-taxi text-ink font-bold hover:bg-taxi-light hover:text-ink',
                      day_today: 'text-taxi-deep font-semibold',
                      day_disabled:
                        'text-ink/20 cursor-not-allowed hover:bg-transparent hover:text-ink/20',
                      day_outside: 'text-ink/30',
                    }}
                  />
                </div>

                {/* Reads as a sentence: "I want to be picked up at 08:30" */}
                <label className="text-ink/80 text-sm font-bold font-body mb-3 flex items-center gap-1.5">
                  <Clock size={14} className="text-taxi-deep" />
                  {t('form.whenLabel')}
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Select
                    value={timeMode}
                    onChange={(v) => setTimeMode(v as TimeMode)}
                    ariaLabel={t('form.whenLabel')}
                    className="sm:flex-1"
                  >
                    <option value="pickup">{t('form.modePickupSentence')}</option>
                    <option value="arrival">{t('form.modeArrivalSentence')}</option>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Select
                      value={hour}
                      onChange={pickHour}
                      ariaLabel={t('form.hour')}
                      className="w-28"
                    >
                      <option value="" disabled>
                        {t('form.hour')}
                      </option>
                      {HOURS.map((h) => (
                        <option key={h} value={h} disabled={hourDisabled(h)}>
                          {h}
                        </option>
                      ))}
                    </Select>
                    <span className="text-taxi-deep font-body">:</span>
                    <Select
                      value={minute}
                      onChange={setMinute}
                      ariaLabel={t('form.minute')}
                      className="w-28"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m} disabled={minuteDisabled(m)}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <p className="text-ink/60 text-xs font-body mt-3">{t('form.timeHint')}</p>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep('trip')}
                    disabled={!scheduleReady}
                    className="flex items-center gap-2 px-6 py-3 bg-taxi text-ink font-body font-bold text-base rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-taxi-light transition-colors"
                  >
                    {t('form.continueTrip')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Trip + map ── */}
            {step === 'trip' && (
              <div className="panel rounded-2xl p-5 sm:p-8 space-y-5">
                <h2 className="font-heading font-bold text-2xl text-ink taxi-rule">{t('form.trip')}</h2>

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

                {form.pickup && form.dropoff && (
                  <RouteMap pickup={form.pickup} dropoff={form.dropoff} polyline={routeInfo?.polyline} />
                )}

                <AnimatePresence>
                  {(estimating || routeInfo) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 px-4 py-3 bg-taxi/20 border border-taxi rounded-xl"
                    >
                      {estimating ? (
                        <span className="flex items-center gap-2 text-ink/70 text-sm font-body">
                          <Loader2 size={12} className="animate-spin" />
                          {t('form.estimating')}
                        </span>
                      ) : routeInfo && pickupTime && arrivalTime ? (
                        <>
                          {routeInfo.distance_km === 0 && (
                            <p className="flex items-start gap-2 text-amber-800 text-sm font-body">
                              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                              {t('form.routeUnavailable')}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-ink/70 text-sm font-body">
                            <Clock size={14} className="text-taxi-deep flex-shrink-0" />
                            {t('form.estimatedMinutes', { minutes: routeInfo.duration_minutes })}
                            {routeInfo.distance_km > 0 && (
                              <span className="text-ink/65">
                                · {t('form.distanceKm', { km: routeInfo.distance_km })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-taxi-deep text-sm font-body">
                            <MapPin size={14} className="flex-shrink-0" />
                            {t('form.pickupAt', { time: fmtTime(pickupTime) })}
                          </div>
                          <div className="flex items-center gap-2 text-ink/70 text-sm font-body">
                            <MapPin size={14} className="flex-shrink-0" />
                            {t('form.arrivalAt', { time: fmtTime(arrivalTime) })}
                          </div>
                        </>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>

                {feasibility.status === 'checking' && (
                  <p className="flex items-center gap-2 text-ink/70 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    {t('feasibility.checking')}
                  </p>
                )}
                {feasibility.status === 'ok' && routeInfo && (
                  <p className="text-emerald-800 text-sm font-body">{t('feasibility.ok')}</p>
                )}
                {feasibility.status === 'blocked' && (
                  <p className="flex items-start gap-2 text-amber-800 text-sm font-body">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    {feasibility.reason}
                  </p>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('schedule')}
                    className="text-ink/65 hover:text-ink text-sm font-body"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={() => setStep('details')}
                    disabled={!tripReady}
                    className="flex items-center gap-2 px-6 py-3 bg-taxi text-ink font-body font-bold text-base rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-taxi-light transition-colors"
                  >
                    {t('form.details')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 'details' && (
              <div className="panel rounded-2xl p-5 sm:p-8 space-y-5">
                <h2 className="font-heading font-bold text-2xl text-ink taxi-rule">{t('form.details')}</h2>
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
                  label={t('form.email')}
                  placeholder={t('form.emailPlaceholder')}
                  value={form.email}
                  onChange={(email) => setForm({ ...form, email })}
                  type="email"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Stepper
                    icon={<Users size={14} />}
                    label={t('form.passengers')}
                    value={passengers}
                    min={1}
                    max={MAX_PASSENGERS}
                    onChange={setPassengers}
                  />
                  <Stepper
                    icon={<Briefcase size={14} />}
                    label={t('form.luggage')}
                    value={luggage}
                    min={0}
                    max={MAX_LUGGAGE}
                    onChange={setLuggage}
                  />
                </div>

                {tightFit && (
                  <p className="flex items-start gap-2 text-amber-800 text-xs font-body leading-relaxed">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    {t('form.capacityNote')}
                  </p>
                )}

                {showFlight ? (
                  <div>
                    <InputField
                      icon={<Plane size={14} />}
                      label={t('form.flightNumber')}
                      placeholder={t('form.flightPlaceholder')}
                      value={flight}
                      onChange={setFlight}
                    />
                    <p className="text-ink/60 text-xs font-body mt-2">
                      {t('form.flightHint')}
                    </p>
                    <button
                      type="button"
                      onClick={hideFlight}
                      className="flex items-center gap-2 min-h-[44px] mt-1 text-ink/70 active:text-ink text-xs font-body underline decoration-ink/25 underline-offset-4 touch-manipulation transition-colors"
                    >
                      <X size={14} className="flex-shrink-0" />
                      {t('form.flightRemove')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlightOverride(true)}
                    className="flex items-center gap-2 min-h-[44px] text-taxi-deep active:text-taxi-deep text-xs font-body touch-manipulation transition-colors"
                  >
                    <Plane size={14} className="flex-shrink-0" />
                    {t('form.airportToggle')}
                  </button>
                )}

                <InputField
                  label={t('form.notes')}
                  placeholder={t('form.notesPlaceholder')}
                  value={form.notes}
                  onChange={(notes) => setForm({ ...form, notes })}
                  multiline
                />
                {/* Honeypot: hidden from people, filled in by bots. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('trip')}
                    className="text-ink/65 hover:text-ink text-sm font-body"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!form.name || !form.phone}
                    className="flex items-center gap-2 px-6 py-3 bg-taxi text-ink font-body font-bold text-base rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-taxi-light"
                  >
                    {t('form.review')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Confirm ── */}
            {step === 'confirm' && (
              <div className="panel rounded-2xl p-5 sm:p-8">
                <h2 className="font-heading font-bold text-2xl text-ink mb-6 taxi-rule">
                  {t('form.submit')}
                </h2>

                {form.pickup && form.dropoff && (
                  <div className="mb-6">
                    <RouteMap pickup={form.pickup} dropoff={form.dropoff} polyline={routeInfo?.polyline} />
                  </div>
                )}

                <div className="space-y-3 mb-8">
                  {[
                    { label: t('form.pickup'), value: form.pickup },
                    { label: t('form.dropoff'), value: form.dropoff },
                    {
                      label: t('form.date'),
                      value: selectedDate ? fmtDate(selectedDate) : '',
                    },
                    ...(pickupTime
                      ? [{ label: t('form.timeModePickup'), value: fmtTime(pickupTime) }]
                      : []),
                    ...(arrivalTime
                      ? [{ label: t('form.timeModeArrival'), value: fmtTime(arrivalTime) }]
                      : []),
                    { label: t('form.name'), value: form.name },
                    { label: t('form.phone'), value: form.phone },
                    ...(form.email.trim() ? [{ label: t('form.emailShort'), value: form.email.trim() }] : []),
                    { label: t('form.passengers'), value: String(passengers) },
                    ...(luggage > 0
                      ? [{ label: t('form.luggage'), value: String(luggage) }]
                      : []),
                    ...(flight.trim()
                      ? [{ label: t('form.flightNumber'), value: flight.trim().toUpperCase() }]
                      : []),
                    ...(routeInfo
                      ? [
                          {
                            label: t('form.estimatedTime'),
                            value: `~${routeInfo.duration_minutes} min`,
                          },
                          ...(routeInfo.distance_km > 0
                            ? [{
                                label: t('form.distance'),
                                value: t('form.distanceKm', { km: routeInfo.distance_km }),
                              }]
                            : []),
                        ]
                      : []),
                    ...(form.notes ? [{ label: t('form.notes'), value: form.notes }] : []),
                  ].map(({ label, value }, i) => (
                    <div key={`${label}-${i}`} className="flex justify-between py-2 border-b border-ink/5">
                      <span className="text-ink/65 text-sm font-body">{label}</span>
                      <span className="text-ink text-sm font-body text-right max-w-[60%]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Nothing is booked until Marc accepts, and he may move the time. */}
                <div className="flex gap-3 mb-6 p-4 rounded-xl border border-taxi bg-taxi/20">
                  <AlertTriangle size={16} className="text-taxi-deep flex-shrink-0 mt-0.5" />
                  <p className="text-ink/70 text-sm font-body leading-relaxed">
                    {t('form.requestNote')}
                  </p>
                </div>

                {error && <p className="text-red-700 text-sm font-body mb-4">{error}</p>}

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep('details')}
                    className="text-ink/65 hover:text-ink text-sm font-body"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || feasibility.status === 'blocked'}
                    className="flex items-center gap-2 px-8 py-3 bg-taxi text-ink font-body font-bold text-base rounded-full disabled:opacity-60 hover:bg-taxi-light"
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

function Select({
  value,
  onChange,
  children,
  ariaLabel,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  ariaLabel: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="w-full appearance-none cursor-pointer bg-field border border-ink/20 text-ink font-body text-sm pl-4 pr-10 py-3 rounded-lg focus:outline-none focus:border-taxi-deep transition-colors [&>option]:bg-field [&>option]:text-ink"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-taxi-deep"
      />
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  icon,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  icon?: React.ReactNode
}) {
  const step = (delta: number) =>
    onChange(Math.min(max, Math.max(min, value + delta)))

  return (
    <div>
      <label className="text-ink/80 text-sm font-bold font-body mb-2 flex items-center gap-1.5">
        {icon && <span className="text-taxi-deep">{icon}</span>}
        {label}
      </label>
      <div className="flex items-center bg-field border border-ink/20 rounded-lg">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`${label} −`}
          className="px-4 py-3 text-ink/70 hover:text-taxi-deep disabled:opacity-25 disabled:hover:text-ink/70 transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="flex-1 text-center text-ink font-body text-sm tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`${label} +`}
          className="px-4 py-3 text-ink/70 hover:text-taxi-deep disabled:opacity-25 disabled:hover:text-ink/70 transition-colors"
        >
          <Plus size={14} />
        </button>
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
    'w-full bg-field border border-ink/20 text-ink font-body text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-taxi-deep transition-colors placeholder:text-ink/50'

  return (
    <div>
      <label className="text-ink/80 text-sm font-bold font-body mb-2 flex items-center gap-1.5">
        {icon && <span className="text-taxi-deep">{icon}</span>}
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
