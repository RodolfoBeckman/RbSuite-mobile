import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Membership } from '../types'

interface AuthContextValue {
  session: Session | null
  membership: Membership | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
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
      return
    }

    // La membresía real (negocio, sucursal, rol) siempre se resuelve del
    // lado del servidor con esta función, nunca se recibe desde el cliente
    // — misma función que usa la web (get_my_membership(), en las
    // migraciones de Supabase).
    supabase.rpc('get_my_membership').then(({ data, error }) => {
      if (error) {
        console.error('No se pudo cargar la membresía del usuario', error)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setMembership({
          businessId: row.business_id,
          branchId: row.branch_id,
          role: row.role,
        })
      }
    })
    // Igual que en la web: se resuelve por session?.user?.id (estable
    // entre refrescos de token) y no por el objeto `session` completo,
    // que Supabase reemplaza en cada evento de onAuthStateChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, membership, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
