import { useQuery, useQueryClient } from '@tanstack/react-query'
import { discardFailed, loadQueue } from './queue'
import { flushQueue } from './flush'

// Para el banner de sincronización en POS/Caja. La cola vive en
// AsyncStorage, no en el cache de React Query — usamos React Query solo
// como mecanismo de refetch/estado, con un intervalo corto porque es una
// lectura local barata (no pega a la red).
export function usePendingQueue() {
  const queryClient = useQueryClient()
  const { data: queue = [] } = useQuery({
    queryKey: ['offline-queue'],
    queryFn: loadQueue,
    refetchInterval: 3000,
  })

  const pending = queue.filter((item) => item.status === 'pending')
  const failed = queue.filter((item) => item.status === 'failed')

  async function retryNow() {
    await flushQueue(queryClient)
  }

  async function discard(id: string) {
    await discardFailed(id)
    queryClient.invalidateQueries({ queryKey: ['offline-queue'] })
  }

  return { pendingCount: pending.length, failed, retryNow, discard }
}
