import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../src/lib/supabase'
import { colors } from '../src/lib/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Omple tots els camps')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) {
      Alert.alert('No s\'ha pogut entrar', error.message)
    } else {
      router.replace('/(tabs)/calendar')
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Correu necessari', 'Escriu el teu correu a dalt i torna-ho a provar.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert(
        'Correu enviat',
        'Revisa la teva safata d\'entrada per restablir la contrasenya.'
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.logoText}>
            Taxi <Text style={{ color: colors.gold }}>Teià</Text>
          </Text>
          <Text style={styles.logoSub}>Driver App</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Correu</Text>
          <TextInput
            style={styles.input}
            placeholder="marctaxiteia@gmail.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            importantForAutofill="yes"
            returnKeyType="next"
          />

          <Text style={styles.label}>Contrasenya</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              importantForAutofill="yes"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>He oblidat la contrasenya</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>

          <View style={styles.autofillHint}>
            <Ionicons name="key-outline" size={13} color={colors.textMuted} />
            <Text style={styles.autofillHintText}>
              Android t&apos;oferirà guardar la contrasenya al Gestor de Google
            </Text>
          </View>

          <TouchableOpacity style={styles.signupLink} onPress={() => router.replace('/signup')}>
            <Text style={styles.signupLinkText}>
              No tens compte? <Text style={{ color: colors.gold }}>Crea&apos;n un</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '600',
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 1,
  },
  logoSub: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  form: {
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 6 },
  forgotText: { color: colors.textMuted, fontSize: 12 },
  button: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },
  autofillHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  autofillHintText: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  signupLink: { alignItems: 'center', marginTop: 20 },
  signupLinkText: { color: colors.textMuted, fontSize: 13 },
})
