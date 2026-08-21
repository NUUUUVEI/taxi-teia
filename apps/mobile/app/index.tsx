import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { colors } from '../src/lib/theme'

export default function Index() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session)
    })
  }, [])

  if (signedIn === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    )
  }

  return <Redirect href={signedIn ? '/(tabs)/calendar' : '/login'} />
}
