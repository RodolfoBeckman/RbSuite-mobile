import NetInfo from '@react-native-community/netinfo'

// Pregunta a NetInfo directamente en el momento, en vez de solo adivinar
// por la forma del error — un error de red en React Native no siempre
// llega como un TypeError "limpio" (algunos entornos le pegan un `code`
// que lo hace parecer un error de Postgrest), así que confiar solo en la
// forma del error podía tratar "no hay señal" como si fuera un rechazo
// real del servidor. NetInfo es la fuente de verdad.
export async function isDeviceOffline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected === false
}
