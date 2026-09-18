import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { enqueue, findPendingMovements, findPendingOpenSession } from '../offline/queue'
import { generateUuid } from '../offline/uuid'
import type { CashMovement, CashMovementType, CashRegister, CashSession } from '../types'

// Un error que sí llegó al servidor (Postgrest/Postgres) trae `code` — un
// fallo de red no tiene esa forma. Ver src/offline/flush.ts.
function isServerRejection(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}

export function useCashRegisters(branchId: string | null) {
  return useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: async (): Promise<CashRegister[]> => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, branch_id, name')
        .eq('branch_id', branchId)
        .eq('active', true)
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        branchId: row.branch_id,
        name: row.name,
      }))
    },
    enabled: !!branchId,
  })
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, name }: { branchId: string; name: string }) => {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({ branch_id: branchId, name })
        .select('id, branch_id, name')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers', variables.branchId] })
    },
  })
}

export function useCurrentCashSession(cashRegisterId: string | null) {
  return useQuery({
    queryKey: ['cash-session', cashRegisterId],
    queryFn: async (): Promise<CashSession | null> => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('id, cash_register_id, opening_amount, opened_at, status')
        .eq('cash_register_id', cashRegisterId)
        .eq('status', 'open')
        .maybeSingle()

      if (error) throw error
      if (data) {
        return {
          id: data.id,
          cashRegisterId: data.cash_register_id,
          openingAmount: Number(data.opening_amount),
          openedAt: data.opened_at,
          status: data.status,
        }
      }

      // El servidor no tiene ninguna sesión abierta todavía, pero puede
      // ser que la apertura se hizo offline y sigue en la cola — en ese
      // caso el id ya es el real (se generó en el cliente), así que en
      // cuanto sincronice, esta misma consulta lo va a encontrar server-
      // side sin que la pantalla tenga que hacer nada especial.
      const pending = cashRegisterId ? await findPendingOpenSession(cashRegisterId) : null
      if (!pending) return null

      return {
        id: pending.payload.p_session_id,
        cashRegisterId: pending.cashRegisterId,
        openingAmount: pending.payload.p_opening_amount,
        openedAt: new Date(pending.createdAt).toISOString(),
        status: 'open',
      }
    },
    enabled: !!cashRegisterId,
    refetchInterval: 4000,
  })
}

export function useCashMovements(sessionId: string | null) {
  return useQuery({
    queryKey: ['cash-movements', sessionId],
    queryFn: async (): Promise<CashMovement[]> => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('id, type, amount, reason, created_at')
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const synced = (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        reason: row.reason,
        createdAt: row.created_at,
      }))

      // Movimientos capturados offline que todavía no sincronizan — se
      // muestran ya (con el mismo id que tendrán al sincronizar) para que
      // la lista no se vea incompleta mientras se recupera la señal.
      const pending = sessionId ? await findPendingMovements(sessionId) : []
      const pendingAsMovements = pending
        .filter((item) => !synced.some((row) => row.id === item.payload.p_movement_id))
        .map((item) => ({
          id: item.payload.p_movement_id,
          type: item.payload.p_type as CashMovementType,
          amount: item.payload.p_type === 'cash_out' ? -item.payload.p_amount : item.payload.p_amount,
          reason: item.payload.p_reason,
          createdAt: new Date(item.createdAt).toISOString(),
        }))

      return [...pendingAsMovements, ...synced]
    },
    enabled: !!sessionId,
    refetchInterval: 4000,
  })
}

export function useOpenCashSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cashRegisterId,
      openingAmount,
    }: {
      cashRegisterId: string
      openingAmount: number
    }) => {
      const sessionId = generateUuid()
      const payload = {
        p_cash_register_id: cashRegisterId,
        p_opening_amount: openingAmount,
        p_session_id: sessionId,
      }

      try {
        const { error } = await supabase.rpc('open_cash_session', payload)
        if (error) throw error
        return { sessionId, queued: false }
      } catch (error) {
        if (isServerRejection(error)) throw error

        await enqueue({ id: sessionId, kind: 'open_cash_session', cashRegisterId, payload })
        return { sessionId, queued: true }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session', variables.cashRegisterId] })
      queryClient.invalidateQueries({ queryKey: ['offline-queue'] })
    },
  })
}

export function useCloseCashSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      countedAmount,
    }: {
      sessionId: string
      cashRegisterId: string
      countedAmount: number
    }) => {
      const { data, error } = await supabase
        .rpc('close_cash_session', {
          p_session_id: sessionId,
          p_counted_amount: countedAmount,
        })
        .single()

      if (error) {
        // Puede pasar que el cierre sí llegó a guardarse la primera vez y
        // solo se perdió la respuesta (conexión inestable) — un segundo
        // intento entonces choca con "ya está cerrada". En vez de tratarlo
        // como error, se lee la sesión ya cerrada y se usan esos valores.
        if (error.message?.includes('ya está cerrada')) {
          const { data: closed, error: fetchError } = await supabase
            .from('cash_sessions')
            .select('expected_amount, difference')
            .eq('id', sessionId)
            .single()
          if (fetchError) throw error
          return {
            expected_amount: Number(closed.expected_amount),
            difference: Number(closed.difference),
          }
        }
        // Cerrar caja sí necesita el expected_amount que calcula el
        // servidor — no es seguro "inventarlo" localmente, así que a
        // diferencia de abrir caja / cobrar / mover efectivo, esto no se
        // encola: se bloquea con un mensaje claro y se reintenta cuando
        // regrese la conexión.
        if (!isServerRejection(error)) {
          throw new Error('Necesitas conexión para cerrar caja — inténtalo de nuevo en un momento.')
        }
        throw error
      }
      return data as { expected_amount: number; difference: number }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session', variables.cashRegisterId] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements', variables.sessionId] })
    },
  })
}

export function useRegisterCashMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      type,
      amount,
      reason,
    }: {
      sessionId: string
      type: Exclude<CashMovementType, 'sale'>
      amount: number
      reason?: string
    }) => {
      const movementId = generateUuid()
      const payload = {
        p_session_id: sessionId,
        p_type: type,
        p_amount: amount,
        p_reason: reason ?? null,
        p_movement_id: movementId,
      }

      try {
        const { error } = await supabase.rpc('register_cash_movement', payload)
        if (error) throw error
        return { movementId, queued: false }
      } catch (error) {
        if (isServerRejection(error)) throw error

        await enqueue({ id: movementId, kind: 'register_cash_movement', sessionId, payload })
        return { movementId, queued: true }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements', variables.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['offline-queue'] })
    },
  })
}
