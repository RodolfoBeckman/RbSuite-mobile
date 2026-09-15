import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useBranches } from './useBranches'

// Si la sucursal activa se desactiva mientras ya estaba seleccionada (ej.
// el Administrador la da de baja desde Configuración en la web), esto la
// limpia para que PosScreen vuelva a mostrar el selector de sucursal en
// vez de seguir operando sobre una sucursal inactiva. Solo aplica cuando
// la elección era libre (membership.branchId nulo, Administrador/Gerente)
// — un Vendedor con sucursal fija nunca elige aquí. Mismo hook que la web.
export function useActiveBranch() {
  const { membership, activeBranchId, setActiveBranchId } = useAuth()
  const { data: branches } = useBranches()

  const canReset = membership?.branchId == null
  const isStale = !!(
    canReset &&
    activeBranchId &&
    branches &&
    !branches.some((b) => b.id === activeBranchId)
  )

  useEffect(() => {
    if (isStale) setActiveBranchId(null)
  }, [isStale, setActiveBranchId])

  return isStale ? null : activeBranchId
}
