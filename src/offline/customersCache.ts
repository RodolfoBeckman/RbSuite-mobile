import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import type { Customer } from '../hooks/useCustomers'

export const CUSTOMERS_CACHE_KEY = 'rb-suite-customers-cache'

function mapRow(row: {
  id: string
  name: string
  phone: string | null
  notes: string | null
  credit_limit: number | null
  balance: number
  is_active: boolean
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    creditLimit: row.credit_limit != null ? Number(row.credit_limit) : null,
    balance: Number(row.balance),
    isActive: row.is_active,
  }
}

export async function fetchAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, notes, credit_limit, balance, is_active')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data ?? []).map(mapRow)
}

// Mismo patrón que branchesCache: se siembra al resolver la sesión, no
// perezosamente al abrir el picker, para que quede listo aunque el
// vendedor active modo avión antes de intentar una venta a fiado.
export async function warmCustomersCache(): Promise<void> {
  try {
    const customers = await fetchAllCustomers()
    await AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers))
  } catch {
    // Sin conexión todavía al arrancar — el cache existente (si lo hay)
    // sigue disponible para el fallback offline.
  }
}

export async function loadCachedCustomers(): Promise<Customer[]> {
  const raw = await AsyncStorage.getItem(CUSTOMERS_CACHE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Customer[]
  } catch {
    return []
  }
}

export async function searchCachedCustomers(term: string): Promise<Customer[]> {
  const customers = await loadCachedCustomers()
  const lower = term.trim().toLowerCase()
  if (!lower) return []
  return customers
    .filter((c) => c.name.toLowerCase().includes(lower) || (c.phone ?? '').includes(term.trim()))
    .slice(0, 10)
}

export async function findCachedCustomer(id: string): Promise<Customer | null> {
  const customers = await loadCachedCustomers()
  return customers.find((c) => c.id === id) ?? null
}

// Mezcla un cliente recién visto (encontrado en línea o creado offline) al
// cache local, para que quede disponible de inmediato sin esperar al
// próximo warmCustomersCache — importante para el cliente que se acaba de
// dar de alta offline: debe poder reencontrarse en esta misma sesión.
export async function upsertCachedCustomer(customer: Customer): Promise<void> {
  const customers = await loadCachedCustomers()
  const next = customers.filter((c) => c.id !== customer.id)
  next.push(customer)
  await AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(next))
}
