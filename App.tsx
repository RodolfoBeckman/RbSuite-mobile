import { useEffect } from 'react'
import { AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
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

export type RootStackParamList = {
  Login: undefined
  Dashboard: undefined
  Pos: undefined
  Caja: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const queryClient = new QueryClient()

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: true, title: 'RB Suite', headerRight: SignOutButton }}
            />
            <Stack.Screen
              name="Pos"
              component={PosScreen}
              options={{ headerShown: true, title: 'Punto de venta' }}
            />
            <Stack.Screen
              name="Caja"
              component={CajaScreen}
              options={{ headerShown: true, title: 'Caja' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
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
})
