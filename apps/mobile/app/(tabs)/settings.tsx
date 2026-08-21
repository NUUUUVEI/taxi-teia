import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  Switch, Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { colors } from '../../src/lib/theme'
import {
  registerForPushNotifications,
  savePushToken,
  removePushToken,
  hasPushToken,
} from '../../src/lib/notifications'
import {
  startLocationSharing,
  stopLocationSharing,
  isLocationSharing,
} from '../../src/lib/location'

const SUPPORT_PHONE = '+34637495591'
const SUPPORT_EMAIL = 'marctaxiteia@gmail.com'
const WEBSITE = 'https://taxi-teia-web.vercel.app'

type Sheet = 'none' | 'profile' | 'password'

export default function SettingsScreen() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)

  const [pushOn, setPushOn] = useState(false)
  const [locationOn, setLocationOn] = useState(isLocationSharing())
  const [pushBusy, setPushBusy] = useState(false)
  const [locBusy, setLocBusy] = useState(false)

  const [sheet, setSheet] = useState<Sheet>('none')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email ?? '')
      setName((user.user_metadata?.full_name as string) ?? '')
      setPhone((user.user_metadata?.phone as string) ?? '')
    }
    setPushOn(await hasPushToken())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Notifications toggle ────────────────────────────────────────────────────
  const togglePush = async (value: boolean) => {
    setPushBusy(true)
    try {
      if (value) {
        const token = await registerForPushNotifications()
        await savePushToken(token)
        setPushOn(true)
      } else {
        await removePushToken()
        setPushOn(false)
      }
    } catch (err) {
      // Surface the real reason instead of silently leaving the switch stuck.
      Alert.alert(
        'Avisos no activats',
        err instanceof Error ? err.message : 'Error desconegut activant els avisos.'
      )
      setPushOn(await hasPushToken())
    } finally {
      setPushBusy(false)
    }
  }

  // ── Location sharing toggle ─────────────────────────────────────────────────
  const toggleLocation = async (value: boolean) => {
    setLocBusy(true)
    try {
      if (value) {
        const ok = await startLocationSharing()
        if (!ok) {
          Alert.alert(
            'Permís denegat',
            'La web necessita la teva ubicació per saber si pots arribar a temps a una recollida.'
          )
        }
        setLocationOn(ok)
      } else {
        stopLocationSharing()
        setLocationOn(false)
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconegut.')
      setLocationOn(isLocationSharing())
    } finally {
      setLocBusy(false)
    }
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), phone: phone.trim() },
    })
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    setSheet('none')
    Alert.alert('Guardat', 'El teu perfil s\'ha actualitzat.')
  }

  const savePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Massa curta', 'La contrasenya ha de tenir com a mínim 6 caràcters.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('No coincideixen', 'Les dues contrasenyes han de ser iguals.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    setNewPassword('')
    setConfirmPassword('')
    setSheet('none')
    Alert.alert('Fet', 'Contrasenya actualitzada. Guarda-la al Gestor de Google la propera vegada que entris.')
  }

  const handleLogout = () => {
    Alert.alert('Tancar sessió', 'Segur que vols sortir?', [
      { text: 'Cancel·lar', style: 'cancel' },
      {
        text: 'Sortir',
        style: 'destructive',
        onPress: async () => {
          stopLocationSharing()
          await supabase.auth.signOut()
          router.replace('/login')
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>AJUSTOS</Text>
        </View>

        {/* Account card */}
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(name || email || 'T').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{name || 'Conductor'}</Text>
            <Text style={styles.accountEmail}>{email}</Text>
            {!!phone && <Text style={styles.accountPhone}>{phone}</Text>}
          </View>
        </View>

        {/* Account section */}
        <Text style={styles.groupLabel}>COMPTE</Text>
        <View style={styles.section}>
          <Row
            icon="person-outline"
            label="Editar perfil"
            onPress={() => setSheet('profile')}
          />
          <Row
            icon="lock-closed-outline"
            label="Canviar contrasenya"
            onPress={() => setSheet('password')}
            last
          />
        </View>

        {/* Preferences */}
        <Text style={styles.groupLabel}>PREFERÈNCIES</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={18} color={colors.gold} />
              <View>
                <Text style={styles.rowLabel}>Avisos de noves reserves</Text>
                <Text style={styles.rowHint}>Notificació push quan entra un viatge</Text>
              </View>
            </View>
            {pushBusy ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Switch
                value={pushOn}
                onValueChange={togglePush}
                trackColor={{ false: colors.border, true: colors.gold + '80' }}
                thumbColor={pushOn ? colors.gold : colors.textMuted}
              />
            )}
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={18} color={colors.gold} />
              <View>
                <Text style={styles.rowLabel}>Compartir ubicació</Text>
                <Text style={styles.rowHint}>La web comprova si arribes a temps</Text>
              </View>
            </View>
            {locBusy ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Switch
                value={locationOn}
                onValueChange={toggleLocation}
                trackColor={{ false: colors.border, true: colors.gold + '80' }}
                thumbColor={locationOn ? colors.gold : colors.textMuted}
              />
            )}
          </View>
        </View>

        {/* Support */}
        <Text style={styles.groupLabel}>AJUDA</Text>
        <View style={styles.section}>
          <Row
            icon="logo-whatsapp"
            label="Suport per WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`)}
          />
          <Row
            icon="mail-outline"
            label="Enviar un correu"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <Row
            icon="globe-outline"
            label="Obrir la web pública"
            onPress={() => Linking.openURL(WEBSITE)}
            last
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Tancar sessió</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Taxi Teià Driver v1.0.0</Text>
      </ScrollView>

      {/* Profile sheet */}
      <Modal visible={sheet === 'profile'} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <SheetHeader title="Editar perfil" onClose={() => setSheet('none')} />

            <Text style={styles.fieldLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Marc García"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Telèfon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+34 6XX XXX XXX"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Correu</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'GUARDANT...' : 'GUARDAR'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password sheet */}
      <Modal visible={sheet === 'password'} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <SheetHeader title="Canviar contrasenya" onClose={() => setSheet('none')} />

            <Text style={styles.fieldLabel}>Nova contrasenya</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Mínim 6 caràcters"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Repeteix la contrasenya</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={savePassword}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'GUARDANT...' : 'ACTUALITZAR'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

function Row({
  icon, label, onPress, last,
}: { icon: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, last && styles.rowLast]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={18} color={colors.gold} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.gold, fontSize: 20, fontWeight: '600' },
  accountName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  accountEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  accountPhone: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  groupLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowLabel: { color: colors.textPrimary, fontSize: 14 },
  rowHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginTop: 28,
    padding: 16,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: 2,
  },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: '500' },
  version: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 16,
  },
  inputDisabled: { color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: colors.black, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
})
