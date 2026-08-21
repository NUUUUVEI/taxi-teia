import { Alert, Linking, Platform } from 'react-native'

/**
 * Waze only reliably resolves free-text addresses through its universal link,
 * so we try the app scheme first and fall back to the https link (which opens
 * the app when installed, or the web app when it isn't).
 */
export async function openWaze(address: string) {
  const q = encodeURIComponent(address.trim())
  const appUrl = `waze://?q=${q}&navigate=yes`
  const webUrl = `https://waze.com/ul?q=${q}&navigate=yes`

  try {
    await Linking.openURL(appUrl)
  } catch {
    try {
      await Linking.openURL(webUrl)
    } catch {
      Alert.alert(
        'No s\'ha pogut obrir Waze',
        'Instal·la Waze o fes servir Google Maps per navegar.'
      )
    }
  }
}

export async function openGoogleMaps(address: string) {
  const q = encodeURIComponent(address.trim())
  const url =
    Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${q}&directionsmode=driving`
      : `google.navigation:q=${q}`

  try {
    await Linking.openURL(url)
  } catch {
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`)
  }
}
