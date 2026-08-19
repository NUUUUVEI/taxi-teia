import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'

type Period = 'week' | 'month' | '3months'

interface DaySummary {
  date: string
  total: number
  trips: number
}

export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>('week')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    let from: Date
    let to = now

    if (period === 'week') {
      from = startOfWeek(now, { weekStartsOn: 1 })
      to = endOfWeek(now, { weekStartsOn: 1 })
    } else if (period === 'month') {
      from = startOfMonth(now)
      to = endOfMonth(now)
    } else {
      from = subDays(now, 90)
    }

    supabase
      .from('bookings')
      .select('*')
      .eq('status', 'completed')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .then(({ data }) => {
        if (data) setBookings(data as Booking[])
        setLoading(false)
      })
  }, [period])

  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.fare) || 0), 0)
  const totalTrips = bookings.length
  const avgFare = totalTrips > 0 ? totalRevenue / totalTrips : 0

  // Group by day for the bar chart
  const byDay: Record<string, DaySummary> = {}
  bookings.forEach((b) => {
    const day = format(new Date(b.start_time), 'yyyy-MM-dd')
    if (!byDay[day]) byDay[day] = { date: day, total: 0, trips: 0 }
    byDay[day].total += Number(b.fare) || 0
    byDay[day].trips += 1
  })
  const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  const maxDay = Math.max(...days.map(d => d.total), 1)

  const PERIOD_LABELS: Record<Period, string> = {
    week: 'This week',
    month: 'This month',
    '3months': 'Last 3 months',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>EARNINGS</Text>
        <View style={styles.periodTabs}>
          {(['week', 'month', '3months'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                {p === '3months' ? '3M' : p === 'month' ? '1M' : '7D'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>€{totalRevenue.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{totalTrips}</Text>
          <Text style={styles.kpiLabel}>Trips</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>€{avgFare.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>Avg / trip</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{PERIOD_LABELS[period]}</Text>
        {days.length === 0 ? (
          <Text style={styles.noData}>No earnings data</Text>
        ) : (
          <View style={styles.bars}>
            {days.map((d) => (
              <View key={d.date} style={styles.barCol}>
                <Text style={styles.barValue}>
                  {d.total > 0 ? `€${d.total.toFixed(0)}` : ''}
                </Text>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${(d.total / maxDay) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {format(new Date(d.date), 'dd/MM')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent completed trips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent trips</Text>
        {bookings.slice(0, 10).map((b) => (
          <View key={b.id} style={styles.tripRow}>
            <View>
              <Text style={styles.tripDate}>
                {format(new Date(b.start_time), 'dd/MM · HH:mm')}
              </Text>
              <Text style={styles.tripRoute} numberOfLines={1}>
                {b.pickup_address} → {b.dropoff_address}
              </Text>
            </View>
            <Text style={[styles.tripFare, !b.fare && { color: colors.textMuted }]}>
              {b.fare != null ? `€${Number(b.fare).toFixed(2)}` : '—'}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  periodTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  periodTabActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '15',
  },
  periodTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  periodTabTextActive: { color: colors.gold },
  kpiRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
    alignItems: 'center',
  },
  kpiValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chartContainer: {
    margin: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 16,
  },
  chartTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 120,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    color: colors.textMuted,
    fontSize: 8,
    marginBottom: 2,
  },
  barBg: {
    width: '70%',
    height: '85%',
    backgroundColor: colors.border,
    borderRadius: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: 1,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  noData: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
  },
  section: { paddingHorizontal: 16 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tripDate: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tripRoute: {
    color: colors.textSecondary,
    fontSize: 13,
    maxWidth: 220,
  },
  tripFare: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },
})
