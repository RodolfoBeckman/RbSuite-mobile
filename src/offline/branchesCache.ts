import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import type { Branch } from '../types'

export const BRANCHES_CACHE_KEY = 'rb-suite-branches-cache'

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('id, business_id, name')
    .eq('active', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
  }))
}

// Se llama justo al resolver la sesión (AuthContext), no solo cuando se
// monta el selector de sucursal — así el cache queda listo aunque el
// usuario nunca haya llegado a abrir POS/Caja antes de perder conexión.
// Antes solo se sembraba de forma perezosa al montar BranchPicker, lo que
// dejaba una ventana real: abrir la app y activar modo avión de inmediato,
// antes de navegar a POS, nunca llegaba a sembrar el cache (bug
// reportado: sigue sin cargar si se activa modo avión "recién abro la
// app... sin haber seleccionado sucursal").
export async function warmBranchesCache(): Promise<void> {
  try {
    const branches = await fetchBranches()
    await AsyncStorage.setItem(BRANCHES_CACHE_KEY, JSON.stringify(branches))
  } catch {
    // Sin conexión todavía al arrancar — no hay nada que sembrar; el
    // cache existente (si lo hay) sigue disponible para el fallback.
  }
}
