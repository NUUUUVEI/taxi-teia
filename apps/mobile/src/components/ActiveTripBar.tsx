import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/theme'
import { useActiveTrip, setActiveTrip } from '../lib/activeTrip'
import { openWaze } from '../lib/navigation'
import { FinishTripSheet } from './FinishTripSheet'

/**
 * Persistent bar shown above the tab bar whenever a journey is in progress, so
 * the driver can navigate, open the trip or enter the fare from any screen.
 */
export function ActiveTripBar() {
  const trip = useActiveTrip()
  const [finishing, setFinishing] = useState(false)

  if (!trip) return null

  const goingToPickup = trip.leg === 'toPickup'
  const target = goingToPickup ? trip.pickup : trip.dropoff

  const advance = async () => {
    if (goingToPickup) {
      await setActiveTrip({ ...trip, leg: 'toDropoff' })
      await openWaze(trip.dropoff)
    } else {
      setFinishing(true)
    }
  }

  return (
    <>
      <View style={styles.wrap}>
        <TouchableOpacity
          style={styles.info}
          onPress={() => router.push(`/trip/${trip.id}`)}
        >
          <View style={styles.pulse} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              {goingToPickup ? 'CAP A LA RECOLLIDA' : 'CAP AL DESTÍ'}
            </Text>
            <Text style={styles.client} numberOfLines={1}>
              {trip.clientName} · {target}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => openWaze(target)}>
          <Ionicons name="navigate" size={18} color={colors.gold} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={advance}>
          <Text style={styles.actionText}>
            {goingToPickup ? 'A BORD' : 'COBRAR'}
          </Text>
        </TouchableOpacity>
      </View>

      <FinishTripSheet
        visible={finishing}
        tripId={trip.id}
        clientName={trip.clientName}
        onClose={() => setFinishing(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold + '55',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  label: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  client: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  iconBtn: {
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  actionText: { color: colors.black, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
})
