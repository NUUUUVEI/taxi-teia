import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { supabase } from '../src/lib/supabase'
import { registerForPushNotifications, savePushToken } from '../src/lib/notifications'
import { startLocationSharing, stopLocationSharing } from '../src/lib/location'
import { hydrateActiveTrip } from '../src/lib/activeTrip'

/**
 * Best-effort at launch. If it fails (no permission, missing projectId, offline)
 * we stay quiet here — Settings surfaces the real reason when the driver toggles
 * the switch by hand.
 */
function registerPushQuietly() {
  registerForPushNotifications()
    .then(savePushToken)
    .catch(() => {})
}

export default function RootLayout() {
  const notifListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    hydrateActiveTrip()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        registerPushQuietly()
        startLocationSharing()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        registerPushQuietly()
        startLocationSharing()
      } else {
        stopLocationSharing()
      }
    })

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received while app is open — could refresh data here
    })

    return () => {
      subscription.unsubscribe()
      notifListener.current?.remove()
    }
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#C9A84C',
          headerTitleStyle: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20 },
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
