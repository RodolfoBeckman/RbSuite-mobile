import { useEffect } from 'react'
import { AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { supabase } from './src/lib/supabase'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import PosScreen from './src/screens/PosScreen'
import CajaScreen from './src/screens/CajaScreen'
import SalesHistoryScreen from './src/screens/SalesHistoryScreen'
import InventoryScreen from './src/screens/InventoryScreen'

export type RootStackParamList = {
  Login: undefined
  Main: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Pos: undefined
  Caja: undefined
  Ventas: undefined
  Inventario: undefined
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()
const queryClient = new QueryClient()

const TAB_ICON: Record<keyof MainTabParamList, string> = {
  Dashboard: '📊',
  Pos: '🛒',
  Caja: '💵',
  Ventas: '🧾',
  Inventario: '📦',
}

// Supabase no refresca el token en segundo plano por sí solo en React
// Native; hay que decírselo explícitamente cuando la app vuelve a primer
// plano (si no, la sesión puede aparecer expirada al reabrir la app).
function useSupabaseAutoRefresh() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    })
    return () => subscription.remove()
  }, [])
}

function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <TouchableOpacity onPress={signOut} hitSlop={8}>
      <Text style={styles.signOut}>Salir</Text>
    </TouchableOpacity>
  )
}

function MainTabs() {
  const { membership } = useAuth()
  const canSeeInventory = membership?.role === 'administrador' || membership?.role === 'gerente'

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: SignOutButton,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: () => <Text style={styles.tabIcon}>{TAB_ICON[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'RB Suite' }} />
      <Tab.Screen name="Pos" component={PosScreen} options={{ title: 'Punto de venta' }} />
      <Tab.Screen name="Caja" component={CajaScreen} options={{ title: 'Caja' }} />
      <Tab.Screen name="Ventas" component={SalesHistoryScreen} options={{ title: 'Ventas' }} />
      {canSeeInventory && (
        <Tab.Screen
          name="Inventario"
          component={InventoryScreen}
          options={{ title: 'Inventario' }}
        />
      )}
    </Tab.Navigator>
  )
}

function RootNavigator() {
  const { session, loading } = useAuth()
  useSupabaseAutoRefresh()

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  signOut: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
})
