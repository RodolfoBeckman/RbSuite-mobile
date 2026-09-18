import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CatalogItem } from '../types'

function catalogCacheKey(branchId: string) {
  return `rb-suite-pos-catalog-cache-${branchId}`
}

interface BusinessProductRow {
  id: string
  sale_price: number
  product: { name: string; barcode: string | null } | { name: string; barcode: string | null }[] | null
  category: { name: string } | { name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function fetchProducts(branchId: string): Promise<CatalogItem[]> {
  const { data: businessProducts, error } = await supabase
    .from('business_products')
    .select('id, sale_price, product:products_catalog(name, barcode), category:categories(name)')
    .eq('active', true)
    .returns<BusinessProductRow[]>()

  if (error) throw error

  const { data: stockRows, error: stockError } = await supabase
    .from('inventory_stock')
    .select('business_product_id, quantity')
    .eq('branch_id', branchId)

  if (stockError) throw stockError

  const stockByProduct = new Map<string, number>(
    (stockRows ?? []).map((row) => [row.business_product_id as string, Number(row.quantity)]),
  )

  return (businessProducts ?? []).map((row) => {
    const product = one(row.product)
    const category = one(row.category)
    return {
      itemType: 'product',
      id: row.id,
      name: product?.name ?? 'Producto sin nombre',
      price: Number(row.sale_price),
      stock: stockByProduct.get(row.id) ?? 0,
      barcode: product?.barcode ?? null,
      categoryName: category?.name ?? null,
    }
  })
}

async function fetchServices(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('active', true)

  if (error) throw error

  return (data ?? []).map((row) => ({
    itemType: 'service',
    id: row.id,
    name: row.name,
    price: Number(row.price),
    stock: null,
    barcode: null,
    categoryName: 'Servicios',
  }))
}

// Catálogo combinado (productos con stock de la sucursal activa + servicios,
// que no tienen stock) para la pantalla de venta. Respeta los módulos
// activos del negocio (Configuración > Módulos) — mismo hook que la web.
//
// Además cachea el último catálogo exitoso en AsyncStorage: si el fetch
// falla por falta de conexión, el POS sigue mostrando productos/servicios
// (con el stock tan fresco como la última sincronización) en vez de
// quedar vacío. Limitación aceptada a propósito: una venta hecha offline
// no valida stock en vivo — si al sincronizar resulta que ya no había
// suficiente, create_sale la rechaza y queda en la cola como "fallida"
// para que el admin la resuelva a mano (ver src/offline/flush.ts).
export function usePosCatalog(
  branchId: string | null,
  modules: { inventario: boolean; servicios: boolean } = { inventario: true, servicios: true },
) {
  return useQuery({
    queryKey: ['pos-catalog', branchId, modules.inventario, modules.servicios],
    queryFn: async (): Promise<CatalogItem[]> => {
      try {
        const [products, services] = await Promise.all([
          modules.inventario ? fetchProducts(branchId!) : Promise.resolve([]),
          modules.servicios ? fetchServices() : Promise.resolve([]),
        ])
        const catalog = [...products, ...services].sort((a, b) => a.name.localeCompare(b.name))
        await AsyncStorage.setItem(catalogCacheKey(branchId!), JSON.stringify(catalog))
        return catalog
      } catch (error) {
        const cached = await AsyncStorage.getItem(catalogCacheKey(branchId!))
        if (cached) return JSON.parse(cached) as CatalogItem[]
        throw error
      }
    },
    enabled: !!branchId,
  })
}
