import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { format, startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { router } from 'expo-router'

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  confirmed: colors.gold,
  completed: colors.success,
  cancelled: colors.error,
}

export default function TodayScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchToday = useCallback(async () => {
    const now = new Date()
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_time', startOfDay(now).toISOString())
      .lte('start_time', endOfDay(now).toISOString())
      .order('start_time', { ascending: true })

    if (!error && data) setBookings(data as Booking[])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchToday()

    // Real-time subscription — new bookings appear instantly
    const channel = supabase
      .channel('today-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchToday()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchToday])

  const confirmBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    fetchToday()
  }

  const completeBooking = async (id: string) => {
    Alert.alert('Complete trip', 'Mark this trip as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          await supabase.from('bookings').update({ status: 'completed' }).eq('id', id)
          fetchToday()
        },
      },
    ])
  }

  const renderItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.time}>
          {format(new Date(item.start_time), 'HH:mm')}
        </Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.clientName}>{item.client_name}</Text>
      <Text style={styles.address} numberOfLines={1}>
        {item.pickup_address}
      </Text>
      <View style={styles.arrowRow}>
        <View style={styles.dot} />
        <View style={styles.line} />
        <View style={[styles.dot, { backgroundColor: colors.gold }]} />
      </View>
      <Text style={styles.address} numberOfLines={1}>
        {item.dropoff_address}
      </Text>

      <View style={styles.meta}>
        <Text style={styles.metaText}>~{item.estimated_minutes} min</Text>
        <Text style={styles.metaText}>{item.service_type}</Text>
      </View>

      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => confirmBooking(item.id)}
        >
          <Text style={styles.actionBtnText}>CONFIRM</Text>
        </TouchableOpacity>
      )}
      {item.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
          onPress={() => completeBooking(item.id)}
        >
          <Text style={[styles.actionBtnText, { color: colors.success }]}>COMPLETE</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerDate}>{format(new Date(), 'EEEE')}</Text>
        <Text style={styles.headerTitle}>{format(new Date(), 'd MMMM yyyy')}</Text>
        <Text style={styles.headerCount}>
          {bookings.filter(b => b.status !== 'cancelled').length} trips today
        </Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchToday() }}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trips today</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerDate: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 2,
  },
  headerCount: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  time: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
  },
  clientName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  address: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 2,
    alignItems: 'center',
    backgroundColor: colors.gold + '15',
  },
  actionBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
})
