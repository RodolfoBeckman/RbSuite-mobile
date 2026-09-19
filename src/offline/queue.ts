import AsyncStorage from '@react-native-async-storage/async-storage'

// Cola de acciones pendientes de sincronizar (venta, apertura de caja,
// movimiento de caja) cuando se hicieron sin conexión. Vive completa en
// AsyncStorage como JSON — es una lista chica (a lo mucho unas cuantas
// decenas de acciones en un mal día sin señal), no justifica SQLite.
const STORAGE_KEY = 'rb-suite-offline-queue'

export type QueueActionKind = 'create_sale' | 'open_cash_session' | 'register_cash_movement'

interface BaseQueueAction {
  id: string
  createdAt: number
  attempts: number
  status: 'pending' | 'failed'
  lastError?: string
}

export interface CreateSaleAction extends BaseQueueAction {
  kind: 'create_sale'
  branchId: string
  payload: {
    id: string
    branch_id: string
    customer_id: string | null
    items: Array<{
      item_type: 'product' | 'service'
      business_product_id: string | null
      service_id: string | null
      quantity: number
      unit_price: number
      discount_amount: number
    }>
    payments: Array<{ method: string; amount: number }>
  }
}

export interface OpenCashSessionAction extends BaseQueueAction {
  kind: 'open_cash_session'
  cashRegisterId: string
  payload: {
    p_cash_register_id: string
    p_opening_amount: number
    p_session_id: string
  }
}

export interface RegisterCashMovementAction extends BaseQueueAction {
  kind: 'register_cash_movement'
  sessionId: string
  payload: {
    p_session_id: string
    p_type: string
    p_amount: number
    p_reason: string | null
    p_movement_id: string
  }
}

export type QueueAction = CreateSaleAction | OpenCashSessionAction | RegisterCashMovementAction

export async function loadQueue(): Promise<QueueAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QueueAction[]
  } catch {
    return []
  }
}

async function saveQueue(queue: QueueAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

type NewQueueAction =
  | Omit<CreateSaleAction, 'createdAt' | 'attempts' | 'status'>
  | Omit<OpenCashSessionAction, 'createdAt' | 'attempts' | 'status'>
  | Omit<RegisterCashMovementAction, 'createdAt' | 'attempts' | 'status'>

export async function enqueue(action: NewQueueAction): Promise<void> {
  const queue = await loadQueue()
  queue.push({ ...action, createdAt: Date.now(), attempts: 0, status: 'pending' } as QueueAction)
  await saveQueue(queue)
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await loadQueue()
  await saveQueue(queue.filter((item) => item.id !== id))
}

export async function markAttempt(id: string): Promise<void> {
  const queue = await loadQueue()
  await saveQueue(
    queue.map((item) => (item.id === id ? { ...item, attempts: item.attempts + 1 } : item)),
  )
}

export async function markFailed(id: string, error: string): Promise<void> {
  const queue = await loadQueue()
  await saveQueue(
    queue.map((item) =>
      item.id === id ? { ...item, status: 'failed', lastError: error } : item,
    ),
  )
}

export async function discardFailed(id: string): Promise<void> {
  await removeFromQueue(id)
}

// Para que CajaScreen pueda "adivinar" que una caja está abierta aunque
// todavía no se haya sincronizado la apertura.
export async function findPendingOpenSession(
  cashRegisterId: string,
): Promise<OpenCashSessionAction | null> {
  const queue = await loadQueue()
  const match = queue.find(
    (item): item is OpenCashSessionAction =>
      item.kind === 'open_cash_session' &&
      item.status === 'pending' &&
      item.cashRegisterId === cashRegisterId,
  )
  return match ?? null
}

// Para que la lista de "Movimientos de la sesión" muestre de inmediato un
// retiro/entrada capturado offline, aunque todavía no exista la fila real
// en cash_movements.
export async function findPendingMovements(sessionId: string): Promise<RegisterCashMovementAction[]> {
  const queue = await loadQueue()
  return queue.filter(
    (item): item is RegisterCashMovementAction =>
      item.kind === 'register_cash_movement' &&
      item.status === 'pending' &&
      item.sessionId === sessionId,
  )
}
