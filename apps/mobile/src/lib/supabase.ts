import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import type { Database } from './types'

const supabaseUrl =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string) ||
  (Constants.expoConfig?.extra?.supabaseUrl as string) ||
  ''

const supabaseAnonKey =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ||
  ''

export const SUPABASE_URL = supabaseUrl

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
