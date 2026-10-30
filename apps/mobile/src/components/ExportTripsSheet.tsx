import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isAfter, startOfMonth, startOfWeek,
} from 'date-fns'
import { colors } from '../lib/theme'
import { fetchTrips, shareIcs, sharePdf } from '../lib/exportTrips'

type Preset = 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'thisWeek', label: 'Aquesta setmana' },
  { key: 'nextWeek', label: 'La setmana que ve' },
  { key: 'thisMonth', label: 'Aquest mes' },
  { key: 'nextMonth', label: 'El mes que ve' },
  { key: 'custom', label: 'Personalitzat' },
]

function presetRange(preset: Preset, now = new Date()): [Date, Date] {
  const week = { weekStartsOn: 1 as const }
  switch (preset) {
    case 'thisWeek': return [startOfWeek(now, week), endOfWeek(now, week)]
    case 'nextWeek': {
      const n = addWeeks(now, 1)
      return [startOfWeek(n, week), endOfWeek(n, week)]
    }
    case 'nextMonth': {
      const n = addMonths(now, 1)
      return [startOfMonth(n), endOfMonth(n)]
    }
    default: return [startOfMonth(now), endOfMonth(now)]
  }
}

type Props = { visible: boolean; onClose: () => void }

/** Pick a date range, then share the trips in it as a PDF or a calendar file. */
export function ExportTripsSheet({ visible, onClose }: Props) {
  const [preset, setPreset] = useState<Preset>('thisMonth')
  const [custom, setCustom] = useState<[Date, Date]>(() => presetRange('thisMonth'))
  const [includePending, setIncludePending] = useState(true)
  const [busy, setBusy] = useState<'pdf' | 'ics' | null>(null)

  const [from, to] = preset === 'custom' ? custom : presetRange(preset)

  const shiftCustom = (which: 0 | 1, days: number) => {
    setCustom(([f, t]) => {
      let nf = which === 0 ? addDays(f, days) : f
      let nt = which === 1 ? addDays(t, days) : t
      // Keep the range the right way round.
      if (isAfter(nf, nt)) {
        if (which === 0) nt = nf
        else nf = nt
      }
      return [nf, nt]
    })
  }

  const run = async (kind: 'pdf' | 'ics') => {
    setBusy(kind)
    try {
      const trips = await fetchTrips(from, to, includePending)
      if (trips.length === 0) {
        Alert.alert('Cap reserva', 'No hi ha reserves en aquestes dates.')
        return
      }
      if (kind === 'pdf') await sharePdf(trips, from, to)
      else await shareIcs(trips, from, to)
    } catch (e) {
      Alert.alert('No s\'ha pogut exportar', e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Exportar reserves</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Tancar">
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPreset(p.key)}
                style={[styles.chip, preset === p.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, preset === p.key && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {preset === 'custom' ? (
            <View style={styles.customBox}>
              {([0, 1] as const).map((which) => (
                <View key={which} style={styles.customRow}>
                  <Text style={styles.customLabel}>{which === 0 ? 'Del' : 'Al'}</Text>
                  <TouchableOpacity onPress={() => shiftCustom(which, -7)} style={styles.stepBtn} accessibilityLabel="Una setmana abans">
                    <Ionicons name="play-back" size={16} color={colors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shiftCustom(which, -1)} style={styles.stepBtn} accessibilityLabel="Un dia abans">
                    <Ionicons name="chevron-back" size={18} color={colors.ink} />
                  </TouchableOpacity>
                  <Text style={styles.customDate}>{format(custom[which], 'EEE d MMM yyyy')}</Text>
                  <TouchableOpacity onPress={() => shiftCustom(which, 1)} style={styles.stepBtn} accessibilityLabel="Un dia després">
                    <Ionicons name="chevron-forward" size={18} color={colors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shiftCustom(which, 7)} style={styles.stepBtn} accessibilityLabel="Una setmana després">
                    <Ionicons name="play-forward" size={16} color={colors.ink} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.range}>
              {format(from, 'd MMM')} – {format(to, 'd MMM yyyy')}
            </Text>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Incloure les pendents de confirmar</Text>
            <Switch
              value={includePending}
              onValueChange={setIncludePending}
              trackColor={{ false: colors.line, true: colors.taxi }}
              thumbColor={includePending ? colors.ink : colors.card}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => run('pdf')} disabled={!!busy}>
              {busy === 'pdf'
                ? <ActivityIndicator color={colors.ink} />
                : <><Ionicons name="document-text-outline" size={18} color={colors.ink} /><Text style={styles.primaryText}>PDF</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => run('ics')} disabled={!!busy}>
              {busy === 'ics'
                ? <ActivityIndicator color={colors.paper} />
                : <><Ionicons name="calendar-outline" size={18} color={colors.paper} /><Text style={styles.secondaryText}>Calendari (.ics)</Text></>}
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            El fitxer .ics s'obre amb Google Calendar o el calendari del mòbil i hi afegeix cada viatge.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,27,22,0.45)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.taxi, borderColor: colors.ink },
  chipText: { color: colors.inkSoft, fontSize: 14 },
  chipTextActive: { color: colors.ink, fontWeight: '700' },
  range: { color: colors.ink, fontSize: 16, fontWeight: '600', marginTop: 16 },
  customBox: { marginTop: 16, gap: 8 },
  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  customLabel: { color: colors.inkSoft, width: 28, fontSize: 14 },
  customDate: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 15, fontWeight: '600' },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18, paddingVertical: 6,
  },
  switchLabel: { color: colors.ink, fontSize: 15, flex: 1, marginRight: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.taxi, paddingVertical: 15, borderRadius: 999,
  },
  primaryText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.ink, paddingVertical: 15, borderRadius: 999,
  },
  secondaryText: { color: colors.paper, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.inkMuted, fontSize: 12, marginTop: 14, lineHeight: 17 },
})
