import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { format } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { Ionicons } from '@expo/vector-icons'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [fare, setFare] = useState('')
  const [savingFare, setSavingFare] = useState(false)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBooking(data as Booking)
          if (data.fare != null) setFare(String(data.fare))
        }
      })
  }, [id])

  const saveFare = async () => {
    if (!booking) return
    const fareNum = parseFloat(fare)
    if (isNaN(fareNum)) { Alert.alert('Invalid fare'); return }

    setSavingFare(true)
    await supabase.from('bookings').update({ fare: fareNum }).eq('id', id)
    setSavingFare(false)
    setBooking({ ...booking, fare: fareNum })
  }

  const updateStatus = async (status: Booking['status']) => {
    if (!booking) return
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBooking({ ...booking, status })
  }

  if (!booking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Loading...</Text>
      </View>
    )
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: colors.warning,
    confirmed: colors.gold,
    completed: colors.success,
    cancelled: colors.error,
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.gold} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTime}>
            {format(new Date(booking.start_time), 'HH:mm · d MMM yyyy')}
          </Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[booking.status] + '20' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[booking.status] }]}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Client */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CLIENT</Text>
        <Text style={styles.fieldValue}>{booking.client_name}</Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${booking.client_phone}`)}
        >
          <Ionicons name="call-outline" size={16} color={colors.gold} />
          <Text style={styles.callBtnText}>{booking.client_phone}</Text>
        </TouchableOpacity>
      </View>

      {/* Route */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROUTE</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.fieldValue}>{booking.pickup_address}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.gold }]} />
          <Text style={styles.fieldValue}>{booking.dropoff_address}</Text>
        </View>
        <Text style={styles.fieldMeta}>
          ~{booking.estimated_minutes} min · {booking.service_type}
        </Text>
      </View>

      {/* Fare */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FARE (€)</Text>
        <View style={styles.fareRow}>
          <TextInput
            style={styles.fareInput}
            value={fare}
            onChangeText={setFare}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveFare}
            disabled={savingFare}
          >
            <Text style={styles.saveBtnText}>{savingFare ? '...' : 'SAVE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes */}
      {booking.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <Text style={styles.fieldValue}>{booking.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {booking.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.gold }]}
            onPress={() => updateStatus('confirmed')}
          >
            <Text style={[styles.actionBtnText, { color: colors.gold }]}>CONFIRM TRIP</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.success }]}
            onPress={() => updateStatus('completed')}
          >
            <Text style={[styles.actionBtnText, { color: colors.success }]}>MARK COMPLETED</Text>
          </TouchableOpacity>
        )}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.error }]}
            onPress={() => {
              Alert.alert('Cancel trip', 'Are you sure?', [
                { text: 'No', style: 'cancel' },
                { text: 'Cancel trip', style: 'destructive', onPress: () => updateStatus('cancelled') },
              ])
            }}
          >
            <Text style={[styles.actionBtnText, { color: colors.error }]}>CANCEL TRIP</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { padding: 4 },
  headerTime: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  badgeText: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fieldValue: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  fieldMeta: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.gold + '10',
    borderWidth: 1,
    borderColor: colors.gold + '30',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  callBtnText: { color: colors.gold, fontSize: 14, fontWeight: '500' },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted, marginTop: 5 },
  routeLine: { width: 1, height: 16, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
  fareRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  fareInput: {
    flex: 1,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  saveBtnText: { color: '#000', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  actions: { margin: 16, marginTop: 24, gap: 10 },
  actionBtn: {
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 3 },
})
