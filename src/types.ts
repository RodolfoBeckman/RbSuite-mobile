// Los tres roles fijos del MVP (mismo modelo que la web: sin pantalla de
// permisos granulares todavía, eso queda para la fase P1).
export type RoleName = 'administrador' | 'gerente' | 'vendedor'

export interface Membership {
  businessId: string
  // branchId null = el usuario ve todas las sucursales del negocio
  // (Gerente/Administrador). Un branchId específico restringe a esa
  // sucursal (Vendedor).
  branchId: string | null
  role: RoleName
}

export interface Branch {
  id: string
  businessId: string
  name: string
}

export interface CatalogItem {
  itemType: 'product' | 'service'
  id: string
  name: string
  price: number
  stock: number | null
}

export interface CartLine {
  item: CatalogItem
  quantity: number
}

export type PaymentMethod = 'cash' | 'card' | 'transfer'
