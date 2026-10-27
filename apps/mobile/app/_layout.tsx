import { useEffect, useRef } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { setDefaultOptions } from 'date-fns'
import { ca } from 'date-fns/locale'
import * as Notifications from 'expo-notifications'
import { supabase } from '../src/lib/supabase'
import { registerForPushNotifications, savePushToken } from '../src/lib/notifications'
import { resumeLocationSharing, stopLocationSharing } from '../src/lib/location'
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

// Every date in the app is shown in Catalan ("dimarts, 27 octubre").
setDefaultOptions({ locale: ca })

export default function RootLayout() {
  const notifListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    hydrateActiveTrip()

    // INITIAL_SESSION covers an already signed-in launch. Token refreshes
    // fire this too, every hour, and must not re-register everything.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        registerPushQuietly()
        resumeLocationSharing().catch(() => {})
      } else if (event === 'SIGNED_OUT') {
        stopLocationSharing(false).catch(() => {})
      }
    })

    // Tapping a new-booking notification opens the list where it can be accepted,
    // also when the tap is what launched the app.
    const openPending = (response: Notifications.NotificationResponse | null) => {
      if (response?.notification.request.content.data?.type === 'new_booking') {
        router.push('/(tabs)/pending')
      }
    }
    Notifications.getLastNotificationResponseAsync().then(openPending)
    notifListener.current = Notifications.addNotificationResponseReceivedListener(openPending)

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
