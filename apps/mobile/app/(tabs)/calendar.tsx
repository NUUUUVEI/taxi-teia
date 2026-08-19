import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  startOfDay, endOfDay,
} from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const STATUS_COLORS: Record<string, string> = {
  pending:   colors.warning,
  confirmed: colors.gold,
  completed: colors.success,
  cancelled: colors.textMuted,
}

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  // Fetch all bookings for the current month (for dot indicators)
  const fetchMonth = useCallback(async () => {
    const from = startOfMonth(currentMonth)
    const to   = endOfMonth(currentMonth)
    const { data } = await supabase
      .from('bookings')
      .select('id, start_time, status')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .not('status', 'eq', 'cancelled')
    setAllBookings((data ?? []) as Booking[])
  }, [currentMonth])

  const fetchDay = useCallback(async (day: Date) => {
    setLoadingDay(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_time', startOfDay(day).toISOString())
      .lte('start_time', endOfDay(day).toISOString())
      .order('start_time', { ascending: true })
    setDayBookings((data ?? []) as Booking[])
    setLoadingDay(false)
  }, [])

  useEffect(() => { fetchMonth() }, [fetchMonth])
  useEffect(() => { fetchDay(selectedDay) }, [fetchDay, selectedDay])

  // Build calendar grid
  const monthStart   = startOfMonth(currentMonth)
  const monthEnd     = endOfMonth(currentMonth)
  const calStart     = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd       = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  const tripDays = new Set(
    allBookings.map(b => format(new Date(b.start_time), 'yyyy-MM-dd'))
  )

  const tripCountByDay: Record<string, number> = {}
  allBookings.forEach(b => {
    const key = format(new Date(b.start_time), 'yyyy-MM-dd')
    tripCountByDay[key] = (tripCountByDay[key] || 0) + 1
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(m => subMonths(m, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy').toUpperCase()}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(m => addMonths(m, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS_OF_WEEK.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {days.map((day, i) => {
          const key  = format(day, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isSameDay(day, selectedDay)
          const isToday = isSameDay(day, new Date())
          const hasTrips = tripDays.has(key)
          const count = tripCountByDay[key] || 0

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[
                styles.dayNum,
                !isCurrentMonth && styles.dayNumFaded,
                isSelected && styles.dayNumSelected,
                isToday && !isSelected && styles.dayNumToday,
              ]}>
                {format(day, 'd')}
              </Text>
              {hasTrips && (
                <View style={styles.dotRow}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                    <View key={di} style={[styles.dot, isSelected && { backgroundColor: colors.black }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Selected day trips */}
      <View style={styles.dayPanel}>
        <Text style={styles.dayPanelTitle}>
          {format(selectedDay, 'EEEE, d MMMM').toUpperCase()}
          {dayBookings.length > 0 && (
            <Text style={{ color: colors.gold }}> · {dayBookings.length}</Text>
          )}
        </Text>

        {loadingDay ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : dayBookings.length === 0 ? (
          <Text style={styles.emptyText}>No trips this day</Text>
        ) : (
          <FlatList
            data={dayBookings}
            keyExtractor={b => b.id}
            renderItem={({ item: b }) => (
              <TouchableOpacity
                style={styles.tripCard}
                onPress={() => router.push(`/trip/${b.id}`)}
              >
                <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[b.status] ?? colors.border }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.tripTop}>
                    <Text style={styles.tripTime}>{format(new Date(b.start_time), 'HH:mm')}</Text>
                    <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[b.status] ?? colors.border) + '20' }]}>
                      <Text style={[styles.badgeText, { color: STATUS_COLORS[b.status] ?? colors.textMuted }]}>
                        {b.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tripClient}>{b.client_name}</Text>
                  <Text style={styles.tripRoute} numberOfLines={1}>
                    {b.pickup_address} → {b.dropoff_address}
                  </Text>
                  {b.fare != null && (
                    <Text style={styles.tripFare}>€{Number(b.fare).toFixed(2)}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  navBtn: { padding: 8 },
  monthLabel: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
  dayHeader: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8 },
  dayCell: {
    width: '14.28%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, paddingVertical: 4,
  },
  dayCellSelected: { backgroundColor: colors.gold },
  dayCellToday: { borderWidth: 1, borderColor: colors.gold },
  dayNum: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  dayNumFaded: { color: colors.textMuted },
  dayNumSelected: { color: colors.black, fontWeight: '700' },
  dayNumToday: { color: colors.gold },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold },
  dayPanel: {
    flex: 1, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingTop: 12,
  },
  dayPanelTitle: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
  tripCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 4, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, paddingRight: 4 },
  tripTime: { color: colors.gold, fontSize: 14, fontWeight: '700', padding: 10, paddingRight: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  tripClient: { color: colors.textPrimary, fontSize: 13, paddingHorizontal: 10, fontWeight: '500' },
  tripRoute: { color: colors.textMuted, fontSize: 11, paddingHorizontal: 10, marginTop: 2 },
  tripFare: { color: colors.success, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingBottom: 8, marginTop: 2 },
})
