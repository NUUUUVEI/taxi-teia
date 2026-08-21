import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/lib/theme'
import { ActiveTripBar } from '../../src/components/ActiveTripBar'

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <Tabs
        initialRouteName="calendar"
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10 },
          headerStyle: { backgroundColor: colors.black },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontSize: 18 },
        }}
      >
        {/* 1 — Calendar */}
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendari',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />

        {/* 2 — Pending trips to accept / decline / reschedule */}
        <Tabs.Screen
          name="pending"
          options={{
            title: 'Pendents',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />

        {/* 3 — Car expenses with invoices */}
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Despeses',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />

        {/* 4 — History */}
        <Tabs.Screen
          name="history"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="archive-outline" size={size} color={color} />
            ),
          }}
        />

        {/* 5 — Settings */}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden — superseded by pending + expenses */}
        <Tabs.Screen name="today" options={{ href: null }} />
        <Tabs.Screen name="earnings" options={{ href: null }} />
      </Tabs>

      <ActiveTripBar />
    </View>
  )
}
