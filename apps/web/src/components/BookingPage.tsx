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
import { getSupabase } from '@/lib/supabase'
import { PlaceInput } from './PlaceInput'
import { RouteMap } from './RouteMap'
import { dateLocales } from '@/lib/dateLocale'
import { MAX_LUGGAGE, MAX_PASSENGERS, type Booking, type DriverLocation } from '@/lib/types'

const BUFFER_MINUTES = 10

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
    route: fallback ?? { duration_minutes: minutes, distance_km: 0, polyline: null },
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
          const route = await fetchRoute(form.pickup, form.dropoff, dep)
          if (route) {
            setRouteInfo(route)
            setPickupTime(requestedTime)
            setArrivalTime(addMinutes(requestedTime, route.duration_minutes))
          }
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
    const newStart = pickupTime
    const newEnd = addMinutes(newStart, routeInfo.duration_minutes)

    try {
      const day = format(newStart, 'yyyy-MM-dd')
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

        if (newStart < tripEnd && tripStart < newEnd) {
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

        const transferRoute = await fetchRoute(origin, dest, Math.floor(gapStart.getTime() / 1000))
        const transferMin = (transferRoute?.duration_minutes ?? 20) + BUFFER_MINUTES
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

      const supabase2 = getSupabase()
      if (supabase2) {
        const { data } = await supabase2
          .from('driver_location')
          .select('lat, lng, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const locData = data as Pick<DriverLocation, 'lat' | 'lng' | 'updated_at'> | null

        if (locData) {
          const locationAge = (Date.now() - new Date(locData.updated_at).getTime()) / 60000
          if (locationAge < 60) {
            const driverCoord = `${locData.lat},${locData.lng}`
            const minutesUntilTrip = (newStart.getTime() - Date.now()) / 60000
            const driveRoute = await fetchRoute(
              driverCoord,
              form.pickup,
              Math.floor(newStart.getTime() / 1000)
            )
            const driveMin = driveRoute?.duration_minutes ?? 0
            if (driveMin > minutesUntilTrip) {
              setFeasibility({
                status: 'blocked',
                reason: t('feasibility.driverTooFar', { minutes: Math.ceil(driveMin) }),
              })
              return
            }
          }
        }
      }

      setFeasibility({ status: 'ok' })
    } catch {
      setFeasibility({ status: 'ok' })
    }
  }, [pickupTime, routeInfo, form.pickup, form.dropoff, t])

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
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(`${t('errors.generic')} (${data.error ?? res.status})`)
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
          className="glass rounded-sm p-12 max-w-md text-center"
        >
          <CheckCircle2 size={48} className="text-gold mx-auto mb-6" />
          <h2 className="font-heading text-3xl text-white mb-3">{t('success.title')}</h2>
          <p className="text-white/60 font-body text-sm leading-relaxed">{t('success.message')}</p>
          {pickupTime && (
            <p className="text-gold font-body text-sm mt-4">
              {timeMode === 'pickup'
                ? t('form.pickupAt', { time: fmtTime(pickupTime) })
                : t('form.arrivalAt', { time: fmtTime(arrivalTime!) })}
            </p>
          )}
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
            {/* ── STEP 1: Schedule ── */}
            {step === 'schedule' && (
              <div className="glass rounded-sm p-5 sm:p-8">
                <h2 className="font-heading text-2xl text-white mb-6 gold-line">
                  {t('form.schedule')}
                </h2>

                {/* Not a centring flex wrapper: the day grid divides the table
                    width between its cells, so the table has to stretch. */}
                <div className="mb-8">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: startOfDay(new Date()) }}
                    className="rdp-custom w-full"
                    classNames={{
                      root: 'font-body w-full',
                      month: 'space-y-4 w-full',
                      caption: 'flex justify-center relative items-center mb-4',
                      caption_label: 'text-white font-heading text-lg',
                      nav: 'flex items-center gap-2',
                      nav_button:
                        'w-11 h-11 flex items-center justify-center text-gold/70 hover:text-gold active:text-gold touch-manipulation transition-colors',
                      table: 'w-full border-collapse',
                      head_row: 'flex',
                      head_cell:
                        'flex-1 text-white/30 rounded-sm font-normal text-xs text-center uppercase tracking-widest',
                      row: 'flex w-full mt-1',
                      cell: 'flex-1 text-center text-sm p-0',
                      // Fluid width with a fixed 44px height: the row divides the
                      // available space so the grid never overflows a narrow
                      // phone, while staying tall enough to tap accurately.
                      day: 'h-11 w-full max-w-[44px] p-0 font-normal text-white/70 hover:bg-gold/10 hover:text-gold active:bg-gold/20 rounded-sm transition-colors duration-150 cursor-pointer mx-auto block touch-manipulation',
                      day_selected: 'bg-gold text-black font-semibold hover:bg-gold-light',
                      day_today: 'text-gold font-semibold',
                      day_disabled:
                        'text-white/20 cursor-not-allowed hover:bg-transparent hover:text-white/20',
                      day_outside: 'text-white/15',
                    }}
                  />
                </div>

                {/* Reads as a sentence: "I want to be picked up at 08:30" */}
                <label className="text-white/40 text-xs font-body tracking-widest uppercase mb-3 flex items-center gap-1.5">
                  <Clock size={14} className="text-gold/60" />
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
                    <span className="text-gold/50 font-body">:</span>
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

                <p className="text-white/35 text-xs font-body mt-3">{t('form.timeHint')}</p>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep('trip')}
                    disabled={!scheduleReady}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-light transition-colors"
                  >
                    {t('form.continueTrip')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Trip + map ── */}
            {step === 'trip' && (
              <div className="glass rounded-sm p-5 sm:p-8 space-y-5">
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

                {form.pickup && form.dropoff && (
                  <RouteMap pickup={form.pickup} dropoff={form.dropoff} polyline={routeInfo?.polyline} />
                )}

                <AnimatePresence>
                  {(estimating || routeInfo) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 px-4 py-3 bg-gold/5 border border-gold/20 rounded-sm"
                    >
                      {estimating ? (
                        <span className="flex items-center gap-2 text-white/70 text-sm font-body">
                          <Loader2 size={12} className="animate-spin" />
                          {t('form.estimating')}
                        </span>
                      ) : routeInfo && pickupTime && arrivalTime ? (
                        <>
                          <div className="flex items-center gap-2 text-white/70 text-sm font-body">
                            <Clock size={14} className="text-gold flex-shrink-0" />
                            {t('form.estimatedMinutes', { minutes: routeInfo.duration_minutes })}
                            {routeInfo.distance_km > 0 && (
                              <span className="text-white/40">
                                · {t('form.distanceKm', { km: routeInfo.distance_km })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-gold text-sm font-body">
                            <MapPin size={14} className="flex-shrink-0" />
                            {t('form.pickupAt', { time: fmtTime(pickupTime) })}
                          </div>
                          <div className="flex items-center gap-2 text-white/60 text-sm font-body">
                            <MapPin size={14} className="flex-shrink-0" />
                            {t('form.arrivalAt', { time: fmtTime(arrivalTime) })}
                          </div>
                        </>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>

                {feasibility.status === 'checking' && (
                  <p className="flex items-center gap-2 text-white/50 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    {t('feasibility.checking')}
                  </p>
                )}
                {feasibility.status === 'ok' && routeInfo && (
                  <p className="text-emerald-400 text-sm font-body">{t('feasibility.ok')}</p>
                )}
                {feasibility.status === 'blocked' && (
                  <p className="flex items-start gap-2 text-amber-400 text-sm font-body">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    {feasibility.reason}
                  </p>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('schedule')}
                    className="text-white/40 hover:text-white text-sm font-body tracking-widest uppercase"
                  >
                    ← {t('form.back')}
                  </button>
                  <button
                    onClick={() => setStep('details')}
                    disabled={!tripReady}
                    className="flex items-center gap-2 px-6 py-3 bg-gold text-black font-body font-semibold text-sm tracking-widest uppercase rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-light transition-colors"
                  >
                    {t('form.details')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 'details' && (
              <div className="glass rounded-sm p-5 sm:p-8 space-y-5">
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
                  <p className="flex items-start gap-2 text-amber-400/90 text-xs font-body leading-relaxed">
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
                    <p className="text-white/35 text-xs font-body mt-2">
                      {t('form.flightHint')}
                    </p>
                    <button
                      type="button"
                      onClick={hideFlight}
                      className="flex items-center gap-2 min-h-[44px] mt-1 text-white/60 active:text-white text-xs font-body underline decoration-white/25 underline-offset-4 touch-manipulation transition-colors"
                    >
                      <X size={14} className="flex-shrink-0" />
                      {t('form.flightRemove')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlightOverride(true)}
                    className="flex items-center gap-2 min-h-[44px] text-gold/80 active:text-gold text-xs font-body tracking-widest uppercase touch-manipulation transition-colors"
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
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('trip')}
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

            {/* ── STEP 4: Confirm ── */}
            {step === 'confirm' && (
              <div className="glass rounded-sm p-5 sm:p-8">
                <h2 className="font-heading text-2xl text-white mb-6 gold-line">
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
                    <div key={`${label}-${i}`} className="flex justify-between py-2 border-b border-white/5">
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
        className="w-full appearance-none cursor-pointer bg-black/40 border border-white/10 text-white font-body text-sm pl-4 pr-10 py-3 rounded-sm focus:outline-none focus:border-gold/50 transition-colors [&>option]:bg-card [&>option]:text-white"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold/60"
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
      <label className="text-white/40 text-xs font-body tracking-widest uppercase mb-2 flex items-center gap-1.5">
        {icon && <span className="text-gold/60">{icon}</span>}
        {label}
      </label>
      <div className="flex items-center bg-black/40 border border-white/10 rounded-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= min}
          aria-label={`${label} −`}
          className="px-4 py-3 text-white/50 hover:text-gold disabled:opacity-25 disabled:hover:text-white/50 transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="flex-1 text-center text-white font-body text-sm tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= max}
          aria-label={`${label} +`}
          className="px-4 py-3 text-white/50 hover:text-gold disabled:opacity-25 disabled:hover:text-white/50 transition-colors"
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
