import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { findCachedCustomer, searchCachedCustomers, upsertCachedCustomer } from '../offline/customersCache'
import { isDeviceOffline } from '../offline/isOffline'
import { enqueue } from '../offline/queue'
import { generateUuid } from '../offline/uuid'
import type { PaymentMethod } from '../types'

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
  creditLimit: number | null
  balance: number
  isActive: boolean
}

function mapCustomer(row: {
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

// Mismos hooks que la web (src/hooks/useCustomers.ts en rb-suite), más un
// fallback a customersCache (AsyncStorage) cuando no hay señal — a
// diferencia de la web, aquí un vendedor puede quedarse sin conexión a
// mitad de una venta a fiado, y buscar/crear cliente no tenía ningún
// respaldo offline (bug reportado: se veía como "Sin resultados" en vez de
// avisar que no hay conexión).
export function useSearchCustomers(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: ['customers-search', trimmed],
    queryFn: async (): Promise<Customer[]> => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, notes, credit_limit, balance, is_active')
          .eq('is_active', true)
          .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
          .order('name')
          .limit(10)

        if (error) throw error
        return (data ?? []).map(mapCustomer)
      } catch (error) {
        const offline = await isDeviceOffline()
        if (!offline) throw error
        return searchCachedCustomers(trimmed)
      }
    },
    enabled: trimmed.length > 0,
  })
}

export function useCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async (): Promise<Customer> => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, notes, credit_limit, balance, is_active')
          .eq('id', customerId)
          .single()

        if (error) throw error
        return mapCustomer(data)
      } catch (error) {
        const offline = await isDeviceOffline()
        const cached = offline ? await findCachedCustomer(customerId!) : null
        if (cached) return cached
        throw error
      }
    },
    enabled: !!customerId,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()

  return useMutation({
    mutationFn: async (input: { name: string; phone?: string }): Promise<Customer> => {
      const row = {
        id: generateUuid(),
        business_id: membership!.businessId,
        name: input.name,
        phone: input.phone || null,
      }

      try {
        const { data, error } = await supabase
          .from('customers')
          .insert(row)
          .select('id, name, phone, notes, credit_limit, balance, is_active')
          .single()

        if (error) throw error
        const customer = mapCustomer(data)
        await upsertCachedCustomer(customer)
        return customer
      } catch (error) {
        const offline = await isDeviceOffline()
        if (!offline) throw error

        await enqueue({ id: row.id, kind: 'create_customer', payload: row })
        const customer: Customer = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          notes: null,
          creditLimit: null,
          balance: 0,
          isActive: true,
        }
        await upsertCachedCustomer(customer)
        return customer
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-search'] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
    },
  })
}

export interface CustomerAccountMovement {
  id: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  paymentMethod: PaymentMethod | null
  saleFolio: number | null
  branchName: string
  reason: string | null
  createdAt: string
}

interface MovementRow {
  id: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  payment_method: PaymentMethod | null
  reason: string | null
  created_at: string
  sale: { folio: number } | { folio: number }[] | null
  branch: { name: string } | { name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function useCustomerAccountMovements(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-account-movements', customerId],
    queryFn: async (): Promise<CustomerAccountMovement[]> => {
      const { data, error } = await supabase
        .from('customer_account_movements')
        .select(
          'id, type, amount, payment_method, reason, created_at, sale:sales(folio), branch:branches(name)',
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .returns<MovementRow[]>()

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        saleFolio: one(row.sale)?.folio ?? null,
        branchName: one(row.branch)?.name ?? '—',
        reason: row.reason,
        createdAt: row.created_at,
      }))
    },
    enabled: !!customerId,
  })
}

export function useRecordCustomerPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      customerId: string
      branchId: string
      amount: number
      paymentMethod: Exclude<PaymentMethod, 'fiado'>
      cashSessionId?: string | null
    }) => {
      const { data, error } = await supabase.rpc('record_customer_payment', {
        p_customer_id: input.customerId,
        p_branch_id: input.branchId,
        p_amount: input.amount,
        p_payment_method: input.paymentMethod,
        p_cash_session_id: input.cashSessionId ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customer-account-movements', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
    },
  })
}

export function useAdjustCustomerBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { customerId: string; amount: number; reason: string }) => {
      const { data, error } = await supabase.rpc('adjust_customer_balance', {
        p_customer_id: input.customerId,
        p_amount: input.amount,
        p_reason: input.reason,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customer-account-movements', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
    },
  })
}

export interface CustomerBalance {
  customerId: string
  name: string
  phone: string | null
  balance: number
}

export function useReportCustomerBalances() {
  return useQuery({
    queryKey: ['customers-receivables'],
    queryFn: async (): Promise<CustomerBalance[]> => {
      const { data, error } = await supabase.rpc('report_customer_balances')
      if (error) throw error
      return (
        (data ?? []) as { customer_id: string; name: string; phone: string | null; balance: number }[]
      ).map((row) => ({
        customerId: row.customer_id,
        name: row.name,
        phone: row.phone,
        balance: Number(row.balance),
      }))
    },
  })
}
