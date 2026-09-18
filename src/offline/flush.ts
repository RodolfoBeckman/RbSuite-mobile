import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isDeviceOffline } from './isOffline'
import {
  loadQueue,
  markAttempt,
  markFailed,
  removeFromQueue,
  type QueueAction,
} from './queue'

type RunResult = { ok: true } | { ok: false; kind: 'network' } | { ok: false; kind: 'rejected'; message: string }

// Un error que sí llegó al servidor (Postgrest/Postgres) trae `code` — un
// fallo de red (sin conexión, DNS, timeout) no tiene esa forma. Es una
// heurística, no un contrato garantizado, pero cubre el caso real: nunca
// vale la pena reintentar un rechazo de negocio (ej. "Stock
// insuficiente"), y siempre vale la pena reintentar uno de red más tarde.
function isServerRejection(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}

async function runAction(item: QueueAction): Promise<RunResult> {
  try {
    if (item.kind === 'create_sale') {
      const { error } = await supabase.rpc('create_sale', { payload: item.payload })
      if (error) throw error
      return { ok: true }
    }
    if (item.kind === 'open_cash_session') {
      const { error } = await supabase.rpc('open_cash_session', item.payload)
      if (error) throw error
      return { ok: true }
    }
    const { error } = await supabase.rpc('register_cash_movement', item.payload)
    if (error) throw error
    return { ok: true }
  } catch (error) {
    // Igual que en useCreateSale/useCaja: NetInfo manda sobre la forma del
    // error — si no hay señal, siempre se trata como fallo de red, sin
    // importar qué forma traiga el error capturado.
    const offline = await isDeviceOffline()
    if (!offline && isServerRejection(error)) {
      return { ok: false, kind: 'rejected', message: error.message }
    }
    return { ok: false, kind: 'network' }
  }
}

function invalidateForAction(item: QueueAction, queryClient: QueryClient) {
  if (item.kind === 'create_sale') {
    queryClient.invalidateQueries({ queryKey: ['pos-catalog', item.branchId] })
  }
  if (item.kind === 'open_cash_session') {
    queryClient.invalidateQueries({ queryKey: ['cash-session', item.cashRegisterId] })
  }
  if (item.kind === 'register_cash_movement') {
    queryClient.invalidateQueries({ queryKey: ['cash-movements', item.sessionId] })
  }
}

// Procesa la cola EN ORDEN, una acción a la vez — importante porque una
// venta en efectivo queda huérfana si se sincroniza antes que la apertura
// de caja de la que depende. Un fallo de red detiene todo (se reintenta
// después); un rechazo real del servidor solo descarta esa acción y sigue
// con las demás.
async function runFlush(queryClient: QueryClient): Promise<void> {
  const queue = await loadQueue()

  for (const item of queue) {
    if (item.status !== 'pending') continue

    await markAttempt(item.id)
    const result = await runAction(item)

    if (result.ok) {
      await removeFromQueue(item.id)
      invalidateForAction(item, queryClient)
      continue
    }

    if (result.kind === 'network') {
      break
    }

    await markFailed(item.id, result.message)
  }

  queryClient.invalidateQueries({ queryKey: ['offline-queue'] })
}

// useOfflineSyncTriggers dispara flushQueue() desde tres eventos distintos
// (montar, NetInfo, AppState) que pueden llegar casi al mismo tiempo al
// reconectar — sin este guard, dos llamadas concurrentes cargaban la
// misma cola ANTES de que la primera alcanzara a quitar el item ya
// sincronizado, y reintentaban la misma acción por partida doble/triple
// (bug reportado: una venta de 1 producto descontó 3 al salir de modo
// avión). Una sola bandera en memoria basta — todo corre en un solo hilo
// de JS, así que "concurrente" aquí solo significa llamadas entrelazadas,
// no llamadas simultáneas de verdad.
let inFlight: Promise<void> | null = null

export function flushQueue(queryClient: QueryClient): Promise<void> {
  if (!inFlight) {
    inFlight = runFlush(queryClient).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}
