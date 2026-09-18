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
import { fetchSaleReceipt } from '../hooks/useSaleReceipt'
import { useCancelSale, useSalesHistory } from '../hooks/useSales'
import { printReceipt } from '../printing/printReceipt'
import { usePairedPrinter } from '../printing/printerStorage'
import { shareReceiptPdf } from '../printing/receiptPdf'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
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
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)

  const { data: sales, isLoading, error } = useSalesHistory(7)
  const cancelSale = useCancelSale()
  const { data: pairedPrinter } = usePairedPrinter()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [printingId, setPrintingId] = useState<string | null>(null)

  async function handlePrint(saleId: string) {
    setPrintingId(saleId)
    setFeedback(null)
    try {
      const receipt = await fetchSaleReceipt(saleId)
      if (pairedPrinter) {
        await printReceipt(receipt)
      } else {
        await shareReceiptPdf(receipt)
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo generar el ticket',
      })
    } finally {
      setPrintingId(null)
    }
  }

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
        {isLoading && <ActivityIndicator style={styles.loading} color={palette.primary} />}
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
              <Text style={[styles.rowTotal, { color: palette.dark }]}>
                {currency.format(sale.total)}
              </Text>
              <TouchableOpacity
                style={[styles.reprintButton, printingId === sale.id && styles.disabled]}
                activeOpacity={0.7}
                disabled={printingId === sale.id}
                onPress={() => handlePrint(sale.id)}
              >
                <Text style={styles.reprintButtonText}>
                  {printingId === sale.id
                    ? 'Generando…'
                    : pairedPrinter
                      ? 'Reimprimir'
                      : 'PDF'}
                </Text>
              </TouchableOpacity>
              {sale.status === 'cancelled' ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Cancelada</Text>
                </View>
              ) : canCancel ? (
                <TouchableOpacity
                  style={[styles.cancelButton, cancelSale.isPending && styles.disabled]}
                  activeOpacity={0.7}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
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
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    rowInfo: {
      flex: 1,
      marginRight: 8,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    rowDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    rowActions: {
      alignItems: 'flex-end',
      gap: 6,
    },
    rowTotal: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    badge: {
      backgroundColor: colors.dangerTint,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    cancelButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
    },
    reprintButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    reprintButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    disabled: {
      opacity: 0.5,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 12,
    },
    textSuccess: {
      color: colors.success,
      marginTop: 4,
    },
    textDanger: {
      color: colors.danger,
      marginTop: 4,
    },
  })
}
