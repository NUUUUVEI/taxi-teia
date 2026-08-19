import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { format } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { router } from 'expo-router'

const PAGE_SIZE = 20

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchHistory = useCallback(async (pageNum = 0, append = false) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (!error && data) {
      setBookings(prev => append ? [...prev, ...(data as Booking[])] : (data as Booking[]))
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchHistory(0) }, [fetchHistory])

  const loadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchHistory(nextPage, true)
  }

  const renderItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
    >
      <View style={styles.dateCol}>
        <Text style={styles.dateDay}>
          {format(new Date(item.start_time), 'd')}
        </Text>
        <Text style={styles.dateMon}>
          {format(new Date(item.start_time), 'MMM')}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTime}>
          {format(new Date(item.start_time), 'HH:mm')}
        </Text>
        <Text style={styles.rowClient}>{item.client_name}</Text>
        <Text style={styles.rowRoute} numberOfLines={1}>
          {item.pickup_address} → {item.dropoff_address}
        </Text>
      </View>
      <View style={styles.fareCol}>
        {item.fare != null ? (
          <Text style={styles.fare}>€{Number(item.fare).toFixed(2)}</Text>
        ) : (
          <Text style={styles.fareEmpty}>—</Text>
        )}
        <Text style={styles.mins}>{item.estimated_minutes}′</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>HISTORY</Text>
        <Text style={styles.headerCount}>{bookings.length} completed trips</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchHistory(0) }}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No completed trips yet</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  headerLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerCount: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
    gap: 12,
  },
  dateCol: {
    width: 36,
    alignItems: 'center',
  },
  dateDay: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  dateMon: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowBody: { flex: 1 },
  rowTime: {
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 2,
  },
  rowClient: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowRoute: {
    color: colors.textMuted,
    fontSize: 12,
  },
  fareCol: {
    alignItems: 'flex-end',
    minWidth: 54,
  },
  fare: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },
  fareEmpty: {
    color: colors.textMuted,
    fontSize: 15,
  },
  mins: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
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
