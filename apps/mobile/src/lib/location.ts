import * as Location from 'expo-location'
import { supabase } from './supabase'

let _watchSubscription: Location.LocationSubscription | null = null

export async function startLocationSharing() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return

  // Push location every 30 seconds while app is open
  _watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 50,
    },
    async (loc) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('driver_location').upsert({
        user_id: user.id,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        updated_at: new Date().toISOString(),
      })
    }
  )
}

export function stopLocationSharing() {
  _watchSubscription?.remove()
  _watchSubscription = null
}
