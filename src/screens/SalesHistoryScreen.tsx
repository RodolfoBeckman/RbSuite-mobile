import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../auth/permissions'
import { useCancelSale, useSalesHistory } from '../hooks/useSales'
import type { Sale } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function SalesHistoryScreen() {
  const { membership } = useAuth()
  const canCancel = hasPermission(membership, 'cancel_sale')

  const { data: sales, isLoading, error } = useSalesHistory(7)
  const cancelSale = useCancelSale()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCancel(saleId: string, folio: number) {
    Alert.alert(
      `¿Cancelar la venta folio ${folio}?`,
      'Esto repone el inventario vendido.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            setFeedback(null)
            cancelSale.mutate(saleId, {
              onSuccess: () =>
                setFeedback({ type: 'success', text: `Venta folio ${folio} cancelada` }),
              onError: (err) =>
                setFeedback({
                  type: 'error',
                  text: err instanceof Error ? err.message : 'No se pudo cancelar la venta',
                }),
            })
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ventas — últimos 7 días</Text>
        {feedback && (
          <Text
            style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}
          >
            {feedback.text}
          </Text>
        )}
        {isLoading && <ActivityIndicator style={styles.loading} color="#2563eb" />}
        {!!error && <Text style={styles.textDanger}>No se pudo cargar el historial.</Text>}
      </View>

      <FlatList
        data={sales ?? []}
        keyExtractor={(sale) => sale.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>No hay ventas en este periodo.</Text> : null
        }
        renderItem={({ item: sale }: { item: Sale }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>
                Folio {sale.folio} — {sale.branchName}
              </Text>
              <Text style={styles.rowDate}>{dateTime.format(new Date(sale.createdAt))}</Text>
            </View>
            <View style={styles.rowActions}>
              <Text style={styles.rowTotal}>{currency.format(sale.total)}</Text>
              {sale.status === 'cancelled' ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Cancelada</Text>
                </View>
              ) : canCancel ? (
                <TouchableOpacity
                  style={[styles.cancelButton, cancelSale.isPending && styles.disabled]}
                  disabled={cancelSale.isPending}
                  onPress={() => handleCancel(sale.id, sale.folio)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  loading: {
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  rowInfo: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  rowDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rowActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rowTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  badge: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  disabled: {
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 12,
  },
  textSuccess: {
    color: '#16a34a',
    marginTop: 4,
  },
  textDanger: {
    color: '#dc2626',
    marginTop: 4,
  },
})
