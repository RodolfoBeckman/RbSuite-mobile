import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const PRINTER_CACHE_KEY = 'rb-suite-paired-printer'
const QUERY_KEY = ['paired-printer']

export interface PairedPrinter {
  target: string
  deviceName: string
}

// La impresora emparejada se guarda una sola vez (desde la pantalla de
// configuración) y se reutiliza en cada venta — no se vuelve a buscar por
// Bluetooth en cada ticket.
export async function getPairedPrinter(): Promise<PairedPrinter | null> {
  const raw = await AsyncStorage.getItem(PRINTER_CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PairedPrinter
  } catch {
    return null
  }
}

export async function setPairedPrinter(printer: PairedPrinter): Promise<void> {
  await AsyncStorage.setItem(PRINTER_CACHE_KEY, JSON.stringify(printer))
}

export async function clearPairedPrinter(): Promise<void> {
  await AsyncStorage.removeItem(PRINTER_CACHE_KEY)
}

// Para que PosScreen/SalesHistoryScreen sepan, sin tener que preguntar
// cada una por su cuenta, si hay impresora Bluetooth para decidir entre
// "Imprimir ticket" o el respaldo de generar PDF (ver receiptPdf.ts).
export function usePairedPrinter() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getPairedPrinter })
}

export function useInvalidatePairedPrinter() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
}
