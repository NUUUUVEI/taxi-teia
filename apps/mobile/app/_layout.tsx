import { useEffect, useState, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { supabase } from '../src/lib/supabase'
import { registerForPushNotifications, savePushToken } from '../src/lib/notifications'
import { startLocationSharing, stopLocationSharing } from '../src/lib/location'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const notifListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        registerForPushNotifications().then(token => {
          if (token) savePushToken(token)
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        registerForPushNotifications().then(token => {
          if (token) savePushToken(token)
        })
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
        <Stack.Screen name="index" redirect={!loading && !!session} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
