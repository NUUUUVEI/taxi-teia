import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/** Thrown with a message safe to show the driver directly. */
export class PushError extends Error {}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // Present in EAS-built binaries even when expoConfig is trimmed.
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  )
}

export async function registerForPushNotifications(): Promise<string> {
  if (!Device.isDevice) {
    throw new PushError(
      'Les notificacions push només funcionen en un mòbil real, no en un emulador.'
    )
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    throw new PushError(
      'Activa les notificacions per a Taxi Teià als ajustos del telèfon.'
    )
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Nova reserva',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
    })
  }

  // Without an explicit projectId this throws inside standalone/EAS builds.
  const projectId = resolveProjectId()
  if (!projectId) {
    throw new PushError(
      "No s'ha trobat el projectId d'EAS. Revisa extra.eas.projectId a app.json."
    )
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Android push rides on Firebase Cloud Messaging. Without a bundled
    // google-services.json the native call fails with a raw Java stack trace,
    // which means nothing to the driver.
    if (message.includes('FirebaseApp') || message.includes('FirebaseInstallations')) {
      throw new PushError(
        'Aquesta versió de l\'app no té la configuració de Firebase per rebre avisos. Cal generar una nova versió amb el fitxer google-services.json.'
      )
    }
    throw new PushError(message)
  }
}

export async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new PushError('Sessió caducada. Torna a entrar.')

  const { error } = await supabase
    .from('driver_push_tokens')
    .upsert({ user_id: user.id, token, updated_at: new Date().toISOString() })

  if (error) throw new PushError(error.message)
}

/** Stops booking pushes for this driver by dropping the stored token. */
export async function removePushToken() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('driver_push_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) throw new PushError(error.message)
}

export async function hasPushToken(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from('driver_push_tokens')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}
