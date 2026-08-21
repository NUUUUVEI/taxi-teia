import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { format, parseISO, isValid } from 'date-fns'
import { supabase } from '../../src/lib/supabase'
import type { Booking } from '../../src/lib/types'
import { colors } from '../../src/lib/theme'
import { openWaze, openGoogleMaps } from '../../src/lib/navigation'
import { useActiveTrip, setActiveTrip, clearActiveTrip } from '../../src/lib/activeTrip'
import { FinishTripSheet } from '../../src/components/FinishTripSheet'
import { Ionicons } from '@expo/vector-icons'

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warning,
  confirmed: colors.gold,
  completed: colors.success,
  cancelled: colors.error,
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [finishing, setFinishing] = useState(false)

  // Edit sheet
  const [editing, setEditing] = useState(false)
  const [eDate, setEDate] = useState('')
  const [eTime, setETime] = useState('')
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [ePickup, setEPickup] = useState('')
  const [eDropoff, setEDropoff] = useState('')
  const [eFare, setEFare] = useState('')
  const [eMinutes, setEMinutes] = useState('')
  const [saving, setSaving] = useState(false)

  const activeTrip = useActiveTrip()
  const isActive = activeTrip?.id === id
  const leg = isActive ? activeTrip.leg : null

  const load = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*').eq('id', id).single()
    if (data) setBooking(data as Booking)
  }, [id])

  useEffect(() => { load() }, [load])

  const updateStatus = async (status: Booking['status']) => {
    if (!booking) return
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { Alert.alert('Error', error.message); return }
    if (status === 'cancelled' && isActive) await clearActiveTrip()
    setBooking({ ...booking, status })
  }

  // ── Journey with Waze ───────────────────────────────────────────────────────
  const startJourney = async () => {
    if (!booking) return
    await setActiveTrip({
      id: booking.id,
      leg: 'toPickup',
      clientName: booking.client_name,
      pickup: booking.pickup_address,
      dropoff: booking.dropoff_address,
    })
    if (booking.status === 'pending') await updateStatus('confirmed')
    await openWaze(booking.pickup_address)
  }

  const goToDestination = async () => {
    if (!booking || !activeTrip) return
    await setActiveTrip({ ...activeTrip, leg: 'toDropoff' })
    await openWaze(booking.dropoff_address)
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!booking) return
    const d = parseISO(booking.start_time)
    setEDate(format(d, 'yyyy-MM-dd'))
    setETime(format(d, 'HH:mm'))
    setEName(booking.client_name)
    setEPhone(booking.client_phone)
    setEPickup(booking.pickup_address)
    setEDropoff(booking.dropoff_address)
    setEFare(booking.fare != null ? String(booking.fare) : '')
    setEMinutes(String(booking.estimated_minutes ?? ''))
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!booking) return

    const when = parseISO(`${eDate}T${eTime}:00`)
    if (!isValid(when)) {
      Alert.alert('Data no vàlida', 'Fes servir el format aaaa-mm-dd i hh:mm.')
      return
    }
    if (!eName.trim() || !ePickup.trim() || !eDropoff.trim()) {
      Alert.alert('Falten dades', 'El nom, la recollida i el destí són obligatoris.')
      return
    }

    const fareNum = eFare.trim() === '' ? null : parseFloat(eFare.replace(',', '.'))
    if (fareNum != null && isNaN(fareNum)) {
      Alert.alert('Import no vàlid', "Revisa l'import del viatge.")
      return
    }

    const minutesNum = parseInt(eMinutes, 10)

    const payload: Partial<Booking> = {
      start_time: when.toISOString(),
      client_name: eName.trim(),
      client_phone: ePhone.trim(),
      pickup_address: ePickup.trim(),
      dropoff_address: eDropoff.trim(),
      fare: fareNum,
      estimated_minutes: isNaN(minutesNum) ? booking.estimated_minutes : minutesNum,
    }

    setSaving(true)
    const { error } = await supabase.from('bookings').update(payload).eq('id', id)
    setSaving(false)

    if (error) { Alert.alert('Error', error.message); return }

    // Keep the floating bar in sync if this trip is the one in progress.
    if (isActive && activeTrip) {
      await setActiveTrip({
        ...activeTrip,
        clientName: payload.client_name!,
        pickup: payload.pickup_address!,
        dropoff: payload.dropoff_address!,
      })
    }

    setEditing(false)
    load()
  }

  if (!booking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Carregant...</Text>
      </View>
    )
  }

  const canNavigate = booking.status === 'confirmed' || booking.status === 'pending'

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTime}>
            {format(parseISO(booking.start_time), 'HH:mm · d MMM yyyy')}
          </Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[booking.status] + '20' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[booking.status] }]}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color={colors.gold} />
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Navigation panel ── */}
      {canNavigate && (
        <View style={styles.navPanel}>
          <Text style={styles.sectionTitle}>NAVEGACIÓ</Text>

          {!isActive && (
            <TouchableOpacity style={styles.wazeBtn} onPress={startJourney}>
              <Ionicons name="navigate" size={18} color={colors.black} />
              <Text style={styles.wazeBtnText}>INICIAR VIATGE</Text>
            </TouchableOpacity>
          )}

          {leg === 'toPickup' && (
            <>
              <View style={styles.legStatus}>
                <Ionicons name="car-sport-outline" size={15} color={colors.gold} />
                <Text style={styles.legStatusText}>Camí de la recollida</Text>
              </View>
              <TouchableOpacity style={styles.wazeBtn} onPress={goToDestination}>
                <Ionicons name="navigate" size={18} color={colors.black} />
                <Text style={styles.wazeBtnText}>PASSATGER A BORD → DESTÍ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.wazeSecondary}
                onPress={() => openWaze(booking.pickup_address)}
              >
                <Text style={styles.wazeSecondaryText}>Tornar a obrir Waze a la recollida</Text>
              </TouchableOpacity>
            </>
          )}

          {leg === 'toDropoff' && (
            <>
              <View style={styles.legStatus}>
                <Ionicons name="flag-outline" size={15} color={colors.gold} />
                <Text style={styles.legStatusText}>Camí del destí</Text>
              </View>
              <TouchableOpacity
                style={[styles.wazeBtn, { backgroundColor: colors.success }]}
                onPress={() => setFinishing(true)}
              >
                <Ionicons name="cash-outline" size={18} color={colors.black} />
                <Text style={styles.wazeBtnText}>FINALITZAR I COBRAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.wazeSecondary}
                onPress={() => openWaze(booking.dropoff_address)}
              >
                <Text style={styles.wazeSecondaryText}>Tornar a obrir Waze al destí</Text>
              </TouchableOpacity>
            </>
          )}

          {isActive && (
            <TouchableOpacity
              style={styles.abortBtn}
              onPress={() => {
                Alert.alert('Aturar el viatge', 'Vols deixar de fer el seguiment?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Aturar', style: 'destructive', onPress: () => clearActiveTrip() },
                ])
              }}
            >
              <Text style={styles.abortText}>Aturar el seguiment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.mapsFallback}
            onPress={() =>
              openGoogleMaps(leg === 'toDropoff' ? booking.dropoff_address : booking.pickup_address)
            }
          >
            <Ionicons name="map-outline" size={14} color={colors.textMuted} />
            <Text style={styles.mapsFallbackText}>Obrir amb Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

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
        <Text style={styles.sectionTitle}>RUTA</Text>
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

      {/* Passengers, luggage and flight */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PASSATGE</Text>
        <View style={styles.paxRow}>
          <View style={styles.paxChip}>
            <Ionicons name="people-outline" size={14} color={colors.gold} />
            <Text style={styles.paxChipText}>{booking.passengers ?? 1}</Text>
          </View>
          <View style={styles.paxChip}>
            <Ionicons name="briefcase-outline" size={14} color={colors.gold} />
            <Text style={styles.paxChipText}>{booking.luggage ?? 0}</Text>
          </View>
          {booking.flight_number ? (
            <View style={[styles.paxChip, styles.flightChip]}>
              <Ionicons name="airplane-outline" size={14} color={colors.black} />
              <Text style={[styles.paxChipText, { color: colors.black, fontWeight: '700' }]}>
                {booking.flight_number}
              </Text>
            </View>
          ) : null}
        </View>
        {booking.flight_number ? (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/search?q=${encodeURIComponent(`vol ${booking.flight_number} estat`)}`,
              )
            }
          >
            <Ionicons name="search-outline" size={16} color={colors.gold} />
            <Text style={styles.callBtnText}>Comprovar estat del vol</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Fare */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IMPORT</Text>
        <View style={styles.fareRow}>
          <Text style={styles.fareValue}>
            {booking.fare != null ? `€${Number(booking.fare).toFixed(2)}` : 'Sense cobrar'}
          </Text>
          <TouchableOpacity style={styles.fareBtn} onPress={() => setFinishing(true)}>
            <Ionicons name="cash-outline" size={15} color={colors.black} />
            <Text style={styles.fareBtnText}>
              {booking.fare != null ? 'CANVIAR' : 'COBRAR'}
            </Text>
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
            <Text style={[styles.actionBtnText, { color: colors.gold }]}>ACCEPTAR VIATGE</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.gold }]}
            onPress={() => updateStatus('confirmed')}
          >
            <Text style={[styles.actionBtnText, { color: colors.gold }]}>
              REOBRIR (ERROR)
            </Text>
          </TouchableOpacity>
        )}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.error }]}
            onPress={() => {
              Alert.alert('Cancel·lar viatge', 'Segur?', [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Cancel·lar',
                  style: 'destructive',
                  onPress: () => updateStatus('cancelled'),
                },
              ])
            }}
          >
            <Text style={[styles.actionBtnText, { color: colors.error }]}>CANCEL·LAR VIATGE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fare / finish popup */}
      <FinishTripSheet
        visible={finishing}
        tripId={booking.id}
        clientName={booking.client_name}
        currentFare={booking.fare ?? null}
        onClose={() => setFinishing(false)}
        onDone={load}
      />

      {/* Edit sheet */}
      <Modal visible={editing} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Corregir el viatge</Text>
              <TouchableOpacity onPress={() => setEditing(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Field label="Data" value={eDate} onChange={setEDate} placeholder="aaaa-mm-dd" />
              <Field label="Hora" value={eTime} onChange={setETime} placeholder="hh:mm" />
              <Field label="Client" value={eName} onChange={setEName} />
              <Field label="Telèfon" value={ePhone} onChange={setEPhone} keyboard="phone-pad" />
              <Field label="Recollida" value={ePickup} onChange={setEPickup} multiline />
              <Field label="Destí" value={eDropoff} onChange={setEDropoff} multiline />
              <Field label="Import (€)" value={eFare} onChange={setEFare} keyboard="decimal-pad" />
              <Field
                label="Durada estimada (min)"
                value={eMinutes}
                onChange={setEMinutes}
                keyboard="number-pad"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveEdit}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'GUARDANT...' : 'GUARDAR CANVIS'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  )
}

function Field({
  label, value, onChange, placeholder, keyboard, multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboard?: 'phone-pad' | 'decimal-pad' | 'number-pad'
  multiline?: boolean
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard}
        multiline={multiline}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.gold + '40', borderRadius: 2,
  },
  editBtnText: { color: colors.gold, fontSize: 12 },

  navPanel: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: colors.gold + '0D',
    borderWidth: 1,
    borderColor: colors.gold + '33',
    borderRadius: 2,
  },
  wazeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: 2,
  },
  wazeBtnText: { color: colors.black, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  wazeSecondary: { alignItems: 'center', paddingVertical: 12 },
  wazeSecondaryText: { color: colors.gold, fontSize: 12 },
  legStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  legStatusText: { color: colors.gold, fontSize: 12, letterSpacing: 1 },
  abortBtn: { alignItems: 'center', paddingVertical: 8 },
  abortText: { color: colors.error, fontSize: 12 },
  mapsFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  mapsFallbackText: { color: colors.textMuted, fontSize: 11 },

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
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  paxChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.gold + '10',
    borderWidth: 1, borderColor: colors.gold + '30', borderRadius: 2,
  },
  paxChipText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  flightChip: { backgroundColor: colors.gold, borderColor: colors.gold },
  fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fareValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  fareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: colors.gold, borderRadius: 2,
  },
  fareBtnText: { color: colors.black, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  actions: { margin: 16, marginTop: 24, gap: 10 },
  actionBtn: {
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 3 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 18,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14, marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: colors.gold, paddingVertical: 16,
    borderRadius: 2, alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { color: colors.black, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
})
