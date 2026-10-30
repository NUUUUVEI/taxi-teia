import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'

/**
 * Shares the driver's position so the website can tell whether he can reach a
 * pick-up in time. Marc mostly drives with Waze in front, so a foreground-only
 * watcher went quiet exactly when it mattered: updates now come from a
 * background task, which Android only allows with a visible notification.
 *
 * If he only grants "while using the app", it falls back to foreground updates.
 */

const TASK = 'driver-location'
const PREF_KEY = 'location_sharing'

export type LocationMode = 'background' | 'foreground'

async function upload(loc: Location.LocationObject) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('driver_location').upsert({
    user_id: session.user.id,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    updated_at: new Date(loc.timestamp).toISOString(),
  })
}

// Must run when the JS bundle loads, including when Android wakes the app in
// the background with no screen mounted; index.js imports this file first.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data) return
  const latest = data.locations[data.locations.length - 1]
  if (latest) await upload(latest)
})

let foregroundWatch: Location.LocationSubscription | null = null

const UPDATE_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60_000,
  distanceInterval: 100,
}

export async function isLocationSharing(): Promise<boolean> {
  if (foregroundWatch) return true
  return Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)
}

/**
 * Returns how it ended up sharing, or null without location permission.
 *
 * @param ask whether to prompt for permissions. On Android 11+ asking for
 *   background access opens the system settings, so only do it when Marc flips
 *   the switch himself, never on every launch.
 */
export async function startLocationSharing(ask = true): Promise<LocationMode | null> {
  const fg = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync()
  if (fg.status !== 'granted') return null

  if (ask) await SecureStore.setItemAsync(PREF_KEY, 'on')

  const bg = ask
    ? await Location.requestBackgroundPermissionsAsync()
    : await Location.getBackgroundPermissionsAsync()
  if (bg.status === 'granted') {
    foregroundWatch?.remove()
    foregroundWatch = null
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK))) {
      await Location.startLocationUpdatesAsync(TASK, {
        ...UPDATE_OPTIONS,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'Taxi Teià',
          notificationBody: 'Compartint la ubicació per a les reserves',
          notificationColor: '#FFC72C',
        },
      })
    }
    return 'background'
  }

  if (!foregroundWatch) {
    foregroundWatch = await Location.watchPositionAsync(UPDATE_OPTIONS, (loc) => { upload(loc) })
  }
  return 'foreground'
}

/**
 * @param remember false on sign-out, so sharing resumes at the next sign-in;
 *   true when Marc turns it off himself, so it stays off.
 */
export async function stopLocationSharing(remember: boolean) {
  if (remember) await SecureStore.setItemAsync(PREF_KEY, 'off')
  foregroundWatch?.remove()
  foregroundWatch = null
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK)
  }
}

/**
 * At launch and sign-in: share unless Marc switched it off in Settings. Asks
 * for permission only the very first time; afterwards it uses what he granted.
 */
export async function resumeLocationSharing() {
  const pref = await SecureStore.getItemAsync(PREF_KEY)
  if (pref === 'off') return
  await startLocationSharing(pref === null)
}
