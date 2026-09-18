import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import type { Membership } from '../types'

const MEMBERSHIP_CACHE_KEY = 'rb-suite-membership-cache'
const ACTIVE_BRANCH_CACHE_KEY = 'rb-suite-active-branch-cache'

interface AuthContextValue {
  session: Session | null
  membership: Membership | null
  loading: boolean
  activeBranchId: string | null
  setActiveBranchId: (branchId: string | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setMembership(null)
      setActiveBranchId(null)
      return
    }

    // La membresía real (negocio, sucursal, rol) siempre se resuelve del
    // lado del servidor con esta función, nunca se recibe desde el cliente
    // — misma función que usa la web (get_my_membership(), en las
    // migraciones de Supabase).
    //
    // Se cachea en AsyncStorage: sin esto, un arranque en frío sin señal
    // dejaba `membership` en null para siempre (sin catch ni respaldo), lo
    // que rompía la app entera, no solo el selector de sucursal.
    async function resolveMembership() {
      async function applyResolved(resolved: Membership) {
        setMembership(resolved)
        if (resolved.branchId) {
          setActiveBranchId(resolved.branchId)
        } else {
          // Administrador/Gerente: no tienen sucursal fija, así que se
          // restaura la última que eligieron (persistida abajo) en vez de
          // forzar el selector de nuevo en cada apertura de la app.
          const cachedBranch = await AsyncStorage.getItem(ACTIVE_BRANCH_CACHE_KEY)
          if (cachedBranch) setActiveBranchId(cachedBranch)
        }
      }

      try {
        const { data, error } = await supabase.rpc('get_my_membership')
        if (error) throw error
        const row = Array.isArray(data) ? data[0] : data
        if (!row) return

        const resolved: Membership = {
          businessId: row.business_id,
          branchId: row.branch_id,
          role: row.role,
          permissionOverrides: row.permission_overrides ?? {},
        }
        await AsyncStorage.setItem(MEMBERSHIP_CACHE_KEY, JSON.stringify(resolved))
        await applyResolved(resolved)
      } catch (error) {
        console.error('No se pudo cargar la membresía del usuario', error)
        const cached = await AsyncStorage.getItem(MEMBERSHIP_CACHE_KEY)
        if (!cached) return
        await applyResolved(JSON.parse(cached) as Membership)
      }
    }

    resolveMembership()
    // Igual que en la web: se resuelve por session?.user?.id (estable
    // entre refrescos de token) y no por el objeto `session` completo,
    // que Supabase reemplaza en cada evento de onAuthStateChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
    await AsyncStorage.multiRemove([MEMBERSHIP_CACHE_KEY, ACTIVE_BRANCH_CACHE_KEY])
  }

  function updateActiveBranchId(branchId: string | null) {
    setActiveBranchId(branchId)
    if (branchId) {
      AsyncStorage.setItem(ACTIVE_BRANCH_CACHE_KEY, branchId).catch(() => {})
    } else {
      AsyncStorage.removeItem(ACTIVE_BRANCH_CACHE_KEY).catch(() => {})
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        membership,
        loading,
        activeBranchId,
        setActiveBranchId: updateActiveBranchId,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
