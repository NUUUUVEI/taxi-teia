import { Alert, Linking } from 'react-native'
import type { Booking } from './types'

/**
 * notify-booking emails the client when a booking is confirmed, rejected,
 * cancelled or moved — but only if they left an email address. These helpers
 * keep Marc aware of which case he is in.
 */
export function emailNotice(b: Booking) {
  return b.client_email
    ? `${b.client_name} rebrà un correu a ${b.client_email}.`
    : `${b.client_name} no ha deixat correu: no rebrà cap avís automàtic.`
}

/** Without an email the client only finds out if Marc calls. */
export function offerCallIfNoEmail(b: Booking, what: string) {
  if (b.client_email) return
  Alert.alert(
    'Avisa el client',
    `${b.client_name} no ha deixat correu, així que no sabrà ${what} si no el truques.`,
    [
      { text: 'Ara no', style: 'cancel' },
      { text: 'Trucar', onPress: () => Linking.openURL(`tel:${b.client_phone}`) },
    ]
  )
}
