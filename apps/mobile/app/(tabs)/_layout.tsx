import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/lib/theme'
import { ActiveTripBar } from '../../src/components/ActiveTripBar'

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Tabs
        initialRouteName="calendar"
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.panel,
            borderTopColor: colors.line,
            height: 64,
            paddingBottom: 4,
          },
          tabBarActiveTintColor: colors.ink,
          tabBarActiveBackgroundColor: colors.taxi,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarItemStyle: { borderRadius: 12, marginHorizontal: 3, marginVertical: 4 },
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontSize: 20, fontWeight: '700' },
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
      </Tabs>

      <ActiveTripBar />
    </View>
  )
}
