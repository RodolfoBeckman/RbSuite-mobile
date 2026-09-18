import { useEffect } from 'react'
import { AppState } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { useQueryClient } from '@tanstack/react-query'
import { flushQueue } from './flush'

// Dispara flushQueue() cuando: (1) NetInfo detecta que hay conexión, (2)
// la app vuelve a primer plano, y (3) al montar (por si quedó algo
// pendiente de una sesión anterior). Sin timer de fondo — estos tres
// casos cubren los escenarios reales sin gastar batería en polling.
export function useOfflineSyncTriggers() {
  const queryClient = useQueryClient()

  useEffect(() => {
    flushQueue(queryClient)

    const netInfoSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushQueue(queryClient)
      }
    })

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushQueue(queryClient)
      }
    })

    return () => {
      netInfoSubscription()
      appStateSubscription.remove()
    }
  }, [queryClient])
}
