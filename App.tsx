import { useEffect } from 'react'
import { AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { supabase } from './src/lib/supabase'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import PosScreen from './src/screens/PosScreen'

export type RootStackParamList = {
  Login: undefined
  Home: undefined
  Pos: undefined
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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Pos"
              component={PosScreen}
              options={{ headerShown: true, title: 'Punto de venta' }}
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
})
