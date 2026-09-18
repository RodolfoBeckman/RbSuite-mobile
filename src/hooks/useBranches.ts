import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BRANCHES_CACHE_KEY, fetchBranches } from '../offline/branchesCache'
import type { Branch } from '../types'

// RLS ya limita esto a las sucursales del negocio actual (y, si el usuario
// tiene branch_id fijo, a esa única sucursal vía current_branch_ids()).
//
// Se cachea la última lista exitosa en AsyncStorage (mismo patrón que
// usePosCatalog): sin esto, un arranque en frío en modo avión — antes de
// elegir sucursal — dejaba el selector vacío para siempre, porque
// activeBranchId nunca persiste entre sesiones y esta era la única fuente
// para llenarlo (bug reportado: "no me deja ver el punto de venta").
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      try {
        const branches = await fetchBranches()
        await AsyncStorage.setItem(BRANCHES_CACHE_KEY, JSON.stringify(branches))
        return branches
      } catch (error) {
        const cached = await AsyncStorage.getItem(BRANCHES_CACHE_KEY)
        if (cached) return JSON.parse(cached) as Branch[]
        throw error
      }
    },
  })
}

export interface BranchDetail extends Branch {
  address: string | null
  timezone: string
  active: boolean
}

// Para Configuración: incluye sucursales inactivas y todos los campos
// editables (el picker del POS/Caja/Inventario usa useBranches, que solo
// trae las activas).
export function useManageBranches() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['branches-manage', membership?.businessId],
    queryFn: async (): Promise<BranchDetail[]> => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, business_id, name, address, timezone, active')
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        address: row.address,
        timezone: row.timezone,
        active: row.active,
      }))
    },
    enabled: !!membership?.businessId,
  })
}

function useInvalidateBranches() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['branches-manage', membership?.businessId] })
  }
}

export function useCreateBranch() {
  const { membership } = useAuth()
  const invalidate = useInvalidateBranches()

  return useMutation({
    mutationFn: async (input: { name: string; address: string; timezone: string }) => {
      const { error } = await supabase.from('branches').insert({
        business_id: membership!.businessId,
        name: input.name,
        address: input.address || null,
        timezone: input.timezone,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateBranch() {
  const invalidate = useInvalidateBranches()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name: string
      address: string
      timezone: string
      active: boolean
    }) => {
      const { error } = await supabase
        .from('branches')
        .update({
          name: input.name,
          address: input.address || null,
          timezone: input.timezone,
          active: input.active,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
