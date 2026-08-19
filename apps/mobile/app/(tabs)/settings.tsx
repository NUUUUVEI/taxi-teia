import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { router } from 'expo-router'
import { colors } from '../../src/lib/theme'
import { Ionicons } from '@expo/vector-icons'

export default function SettingsScreen() {
  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/login')
        },
      },
    ])
  }

  const items = [
    { icon: 'person-outline', label: 'Profile', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'globe-outline', label: 'Language', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SETTINGS</Text>
      </View>

      <View style={styles.section}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} style={styles.row} onPress={item.onPress}>
            <View style={styles.rowLeft}>
              <Ionicons name={item.icon as any} size={18} color={colors.gold} />
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Taxi Teià Driver v1.0.0</Text>
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
  section: {
    marginTop: 24,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: 2,
  },
  logoutText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  version: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 1,
  },
})
