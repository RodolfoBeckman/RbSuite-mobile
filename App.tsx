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
import { useBusinessModules } from './src/hooks/useBusinessModules'
import { useLabels } from './src/hooks/useLabels'
import { supabase } from './src/lib/supabase'
import { useBrandPalette } from './src/theme/useBrandPalette'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import PosScreen from './src/screens/PosScreen'
import CajaScreen from './src/screens/CajaScreen'
import SalesHistoryScreen from './src/screens/SalesHistoryScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import ConfiguracionScreen from './src/screens/ConfiguracionScreen'

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
  Configuracion: undefined
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
  Configuracion: '⚙️',
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
  const labels = useLabels()
  const palette = useBrandPalette()
  const { data: modules } = useBusinessModules()
  const canSeeCaja = modules?.caja !== false
  const canSeeInventory =
    modules?.inventario !== false &&
    (membership?.role === 'administrador' || membership?.role === 'gerente')
  const canSeeConfig = membership?.role === 'administrador' || membership?.role === 'gerente'

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: SignOutButton,
        headerStyle: { backgroundColor: palette.primary },
        headerTintColor: '#fff',
        headerTitleStyle: styles.headerTitle,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: () => <Text style={styles.tabIcon}>{TAB_ICON[route.name]}</Text>,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'RB Suite', tabBarLabel: labels.navDashboard }}
      />
      <Tab.Screen
        name="Pos"
        component={PosScreen}
        options={{ title: labels.posTitle, tabBarLabel: labels.navPos }}
      />
      {canSeeCaja && (
        <Tab.Screen
          name="Caja"
          component={CajaScreen}
          options={{ title: 'Caja', tabBarLabel: labels.navCaja }}
        />
      )}
      <Tab.Screen
        name="Ventas"
        component={SalesHistoryScreen}
        options={{ title: 'Ventas', tabBarLabel: labels.navVentas }}
      />
      {canSeeInventory && (
        <Tab.Screen
          name="Inventario"
          component={InventoryScreen}
          options={{ title: 'Inventario' }}
        />
      )}
      {canSeeConfig && (
        <Tab.Screen
          name="Configuracion"
          component={ConfiguracionScreen}
          options={{ title: 'Configuración', tabBarLabel: 'Config' }}
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
    opacity: 0.9,
  },
  headerTitle: {
    fontWeight: '700',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
  },
})
