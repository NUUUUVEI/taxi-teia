import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native'
import { format } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function PendingScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPending = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    if (!error && data) setBookings(data as Booking[])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchPending()
    // Real-time updates
    const channel = supabase
      .channel('pending-bookings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: 'status=eq.pending',
      }, () => fetchPending())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPending])

  const handleConfirm = async (id: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    fetchPending()
  }

  const handleCancel = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    fetchPending()
  }

  const renderItem = ({ item: b }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trip/${b.id}`)}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.time}>{format(new Date(b.start_time), 'EEE dd/MM · HH:mm')}</Text>
          <Text style={styles.client}>{b.client_name}</Text>
          <Text style={styles.phone}>{b.client_phone}</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>PENDENT</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.gold }]} />
          <Text style={styles.routeText} numberOfLines={1}>{b.pickup_address}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.error }]} />
          <Text style={styles.routeText} numberOfLines={1}>{b.dropoff_address}</Text>
        </View>
      </View>

      {b.estimated_minutes > 0 && (
        <Text style={styles.duration}>~{b.estimated_minutes} min</Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel(b.id)}
        >
          <Ionicons name="close" size={16} color={colors.error} />
          <Text style={styles.cancelBtnText}>Rebutjar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => handleConfirm(b.id)}
        >
          <Ionicons name="checkmark" size={16} color={colors.black} />
          <Text style={styles.confirmBtnText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>VIATGES PENDENTS</Text>
        {bookings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{bookings.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPending() }}
            tintColor={colors.gold}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Cap viatge pendent</Text>
              <Text style={styles.emptySubtext}>Les noves reserves apareixeran aquí</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLabel: { color: colors.gold, fontSize: 11, letterSpacing: 3 },
  countBadge: {
    backgroundColor: colors.warning, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: colors.black, fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: colors.card, borderRadius: 6, borderWidth: 1,
    borderColor: colors.border, marginBottom: 12, overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 14, paddingBottom: 10,
  },
  time: { color: colors.gold, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  client: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  phone: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  pendingBadge: {
    backgroundColor: colors.warning + '20', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.warning + '40',
  },
  pendingBadgeText: { color: colors.warning, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  route: { paddingHorizontal: 14, paddingBottom: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
  routeText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  duration: { color: colors.textMuted, fontSize: 11, paddingHorizontal: 14, paddingBottom: 10 },
  actions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14, borderRightWidth: 1, borderRightColor: colors.border,
  },
  cancelBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 14, backgroundColor: colors.gold,
  },
  confirmBtnText: { color: colors.black, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 16, fontWeight: '500', marginTop: 16 },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
})
