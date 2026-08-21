import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { format, addMinutes, parseISO, isValid } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const NUDGES = [-30, -15, 15, 30]

export default function PendingScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Reschedule modal state
  const [editing, setEditing] = useState<Booking | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPending = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('start_time', { ascending: true })

    if (!error && data) setBookings(data as Booking[])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchPending()
    const channel = supabase
      .channel('pending-bookings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
      }, () => fetchPending())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPending])

  const setStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) Alert.alert('Error', error.message)
    fetchPending()
  }

  const handleDecline = (b: Booking) => {
    Alert.alert(
      'Rebutjar viatge',
      `Segur que vols rebutjar el viatge de ${b.client_name}? El client rebrà un correu.`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Rebutjar', style: 'destructive', onPress: () => setStatus(b.id, 'cancelled') },
      ]
    )
  }

  // ── Reschedule ──────────────────────────────────────────────────────────────
  const openReschedule = (b: Booking) => {
    const d = parseISO(b.start_time)
    setEditing(b)
    setEditDate(format(d, 'yyyy-MM-dd'))
    setEditTime(format(d, 'HH:mm'))
  }

  const nudge = (minutes: number) => {
    const current = parseISO(`${editDate}T${editTime}:00`)
    if (!isValid(current)) return
    const next = addMinutes(current, minutes)
    setEditDate(format(next, 'yyyy-MM-dd'))
    setEditTime(format(next, 'HH:mm'))
  }

  const saveReschedule = async (alsoConfirm: boolean) => {
    if (!editing) return
    const next = parseISO(`${editDate}T${editTime}:00`)
    if (!isValid(next)) {
      Alert.alert('Data no vàlida', 'Fes servir el format aaaa-mm-dd i hh:mm.')
      return
    }

    setSaving(true)
    const payload: Partial<Booking> = alsoConfirm
      ? { start_time: next.toISOString(), status: 'confirmed' }
      : { start_time: next.toISOString() }

    const { error } = await supabase.from('bookings').update(payload).eq('id', editing.id)
    setSaving(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    setEditing(null)
    fetchPending()
  }

  const renderItem = ({ item: b }: { item: Booking }) => {
    const start = parseISO(b.start_time)
    const end = addMinutes(start, b.estimated_minutes)

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => router.push(`/trip/${b.id}`)}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.time}>{format(start, 'EEE dd/MM · HH:mm')}</Text>
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

          <Text style={styles.duration}>
            ~{b.estimated_minutes} min · acaba a les {format(end, 'HH:mm')} ·{' '}
            {b.passengers ?? 1} pax
            {(b.luggage ?? 0) > 0 ? ` · ${b.luggage} maletes` : ''}
          </Text>

          {b.flight_number ? (
            <View style={styles.flightRow}>
              <Ionicons name="airplane" size={13} color={colors.gold} />
              <Text style={styles.flightText}>Vol {b.flight_number}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Reschedule row */}
        <TouchableOpacity style={styles.rescheduleBtn} onPress={() => openReschedule(b)}>
          <Ionicons name="create-outline" size={15} color={colors.gold} />
          <Text style={styles.rescheduleText}>Canviar l&apos;hora</Text>
        </TouchableOpacity>

        {/* Accept / decline */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleDecline(b)}>
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={styles.cancelBtnText}>Rebutjar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setStatus(b.id, 'confirmed')}>
            <Ionicons name="checkmark" size={16} color={colors.black} />
            <Text style={styles.confirmBtnText}>Acceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

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

      {/* Reschedule modal */}
      <Modal visible={!!editing} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Canviar l&apos;hora</Text>
              <TouchableOpacity onPress={() => setEditing(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {editing && (
              <Text style={styles.modalClient}>
                {editing.client_name} · {editing.pickup_address}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Data</Text>
            <TextInput
              style={styles.input}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="aaaa-mm-dd"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Hora de recollida</Text>
            <TextInput
              style={styles.input}
              value={editTime}
              onChangeText={setEditTime}
              placeholder="hh:mm"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            {/* Quick nudges */}
            <View style={styles.nudgeRow}>
              {NUDGES.map(m => (
                <TouchableOpacity key={m} style={styles.nudgeBtn} onPress={() => nudge(m)}>
                  <Text style={styles.nudgeText}>{m > 0 ? `+${m}` : m} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={() => saveReschedule(true)}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'GUARDANT...' : 'GUARDAR I ACCEPTAR'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveOnlyBtn}
              onPress={() => saveReschedule(false)}
              disabled={saving}
            >
              <Text style={styles.saveOnlyText}>Guardar sense acceptar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'flex-start', padding: 14, paddingBottom: 10, gap: 10,
  },
  time: { color: colors.gold, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  client: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  phone: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  pendingBadge: {
    backgroundColor: colors.warning + '20', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.warning + '40',
  },
  pendingBadgeText: { color: colors.warning, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  route: { paddingHorizontal: 14, paddingBottom: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeLine: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 3.5, marginVertical: 2 },
  routeText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  duration: { color: colors.textMuted, fontSize: 11, paddingHorizontal: 14, paddingBottom: 12 },
  flightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginBottom: 12,
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.gold + '12',
    borderWidth: 1, borderColor: colors.gold + '35', borderRadius: 2,
  },
  flightText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  rescheduleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.gold + '0D',
  },
  rescheduleText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
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

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  modalClient: { color: colors.textMuted, fontSize: 12, marginBottom: 18 },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14, marginBottom: 16,
  },
  nudgeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  nudgeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, borderRadius: 2,
  },
  nudgeText: { color: colors.textSecondary, fontSize: 12 },
  saveBtn: {
    backgroundColor: colors.gold, paddingVertical: 16,
    borderRadius: 2, alignItems: 'center',
  },
  saveBtnText: { color: colors.black, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  saveOnlyBtn: { alignItems: 'center', paddingVertical: 14 },
  saveOnlyText: { color: colors.textMuted, fontSize: 13 },
})
