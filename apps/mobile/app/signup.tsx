import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { colors } from '../src/lib/theme'

export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone },
      },
    })
    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
    } else {
      Alert.alert(
        'Account created!',
        'Check your email to confirm your account, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.black }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.logoText}>
            Taxi <Text style={{ color: colors.gold }}>Teià</Text>
          </Text>
          <Text style={styles.logoSub}>Create account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Marc García"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            importantForAutofill="yes"
          />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="+34 6XX XXX XXX"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            importantForAutofill="yes"
          />

          <Text style={styles.label}>Confirm password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            importantForAutofill="yes"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={{ color: colors.gold }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoLetter: { color: colors.gold, fontSize: 22, fontWeight: '600' },
  logoText: { color: colors.textPrimary, fontSize: 28, fontWeight: '600', letterSpacing: 1 },
  logoSub: { color: colors.textMuted, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 },
  form: { gap: 4 },
  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 2, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.textPrimary, fontSize: 14,
  },
  button: {
    backgroundColor: colors.gold, paddingVertical: 16,
    borderRadius: 2, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: colors.textMuted, fontSize: 13 },
})
