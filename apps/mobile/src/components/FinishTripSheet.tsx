import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/types'
import { colors } from '../lib/theme'
import { clearActiveTrip } from '../lib/activeTrip'

const QUICK_FARES = [10, 15, 20, 25, 30, 40]

type Props = {
  visible: boolean
  tripId: string | null
  clientName?: string
  currentFare?: number | null
  onClose: () => void
  onDone?: () => void
}

/**
 * Fare entry + completion popup. Shown when the driver ends a journey, either
 * from the trip screen or from the floating in-progress bar.
 */
export function FinishTripSheet({
  visible, tripId, clientName, currentFare, onClose, onDone,
}: Props) {
  const [fare, setFare] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) setFare(currentFare != null ? String(currentFare) : '')
  }, [visible, currentFare])

  const addQuick = (amount: number) => {
    const base = parseFloat(fare)
    setFare(String((isNaN(base) ? 0 : base) + amount))
  }

  const save = async (markCompleted: boolean) => {
    if (!tripId) return

    const value = parseFloat(fare.replace(',', '.'))
    if (isNaN(value) || value < 0) {
      Alert.alert('Import no vàlid', 'Escriu quant ha costat el viatge.')
      return
    }

    const payload: Partial<Booking> = markCompleted
      ? { fare: value, status: 'completed' }
      : { fare: value }

    setSaving(true)
    const { error } = await supabase.from('bookings').update(payload).eq('id', tripId)
    setSaving(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    if (markCompleted) await clearActiveTrip()
    onDone?.()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Finalitzar viatge</Text>
              {!!clientName && <Text style={styles.subtitle}>{clientName}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Quant ha costat?</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={fare}
              onChangeText={setFare}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={styles.quickGrid}>
            {QUICK_FARES.map(amount => (
              <TouchableOpacity
                key={amount}
                style={styles.quickBtn}
                onPress={() => addQuick(amount)}
              >
                <Text style={styles.quickText}>+{amount}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickBtn} onPress={() => setFare('')}>
              <Ionicons name="backspace-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
            onPress={() => save(true)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color={colors.black} />
                <Text style={styles.primaryText}>GUARDAR I FINALITZAR</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => save(false)}
            disabled={saving}
          >
            <Text style={styles.secondaryText}>
              Guardar l&apos;import sense finalitzar
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  label: {
    color: colors.textSecondary, fontSize: 11, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.gold + '40',
    borderRadius: 2, paddingHorizontal: 16,
  },
  currency: { color: colors.gold, fontSize: 24, fontWeight: '600', marginRight: 8 },
  amountInput: {
    flex: 1, paddingVertical: 14,
    color: colors.textPrimary, fontSize: 28, fontWeight: '700',
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 24 },
  quickBtn: {
    minWidth: 58, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 2,
  },
  quickText: { color: colors.textSecondary, fontSize: 13 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.gold, paddingVertical: 16, borderRadius: 2,
  },
  primaryText: { color: colors.black, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { color: colors.textMuted, fontSize: 13 },
})
