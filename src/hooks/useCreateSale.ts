import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { enqueue } from '../offline/queue'
import { generateUuid } from '../offline/uuid'
import type { CartLine, PaymentMethod } from '../types'

interface CreateSaleArgs {
  branchId: string
  cartLines: CartLine[]
  paymentMethod: PaymentMethod
  total: number
}

interface CreateSaleResult {
  saleId: string
  folio: number | null
  queued: boolean
}

// Un error que sí llegó al servidor (Postgrest/Postgres) trae `code` — un
// fallo de red no tiene esa forma. Ver src/offline/flush.ts, misma
// heurística.
function isServerRejection(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}

// Misma RPC que la web (create_sale, security definer) — nunca se toca
// `sales`/`sale_items`/`inventory_movements` directamente desde el
// cliente. El id de la venta se genera aquí (antes de saber si hay
// internet) para que, si hay que encolarla y reintentarla después,
// create_sale la reconozca como "ya procesada" en vez de duplicarla — ver
// 0019_offline_idempotency.sql.
export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      branchId,
      cartLines,
      paymentMethod,
      total,
    }: CreateSaleArgs): Promise<CreateSaleResult> => {
      const saleId = generateUuid()
      const payload = {
        id: saleId,
        branch_id: branchId,
        items: cartLines.map((line) => ({
          item_type: line.item.itemType,
          business_product_id: line.item.itemType === 'product' ? line.item.id : null,
          service_id: line.item.itemType === 'service' ? line.item.id : null,
          quantity: line.quantity,
          unit_price: line.item.price,
          discount_amount: 0,
        })),
        payments: [{ method: paymentMethod, amount: total }],
      }

      try {
        const { error } = await supabase.rpc('create_sale', { payload })
        if (error) throw error

        const { data: sale } = await supabase
          .from('sales')
          .select('folio')
          .eq('id', saleId)
          .single()

        return { saleId, folio: sale?.folio ?? null, queued: false }
      } catch (error) {
        // Un rechazo real del servidor (ej. stock insuficiente, sucursal
        // inválida) nunca se encola — reintentarlo no lo va a arreglar.
        if (isServerRejection(error)) throw error

        await enqueue({ id: saleId, kind: 'create_sale', branchId, payload })
        return { saleId, folio: null, queued: true }
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pos-catalog', variables.branchId] })
      queryClient.invalidateQueries({ queryKey: ['offline-queue'] })
    },
  })
}
