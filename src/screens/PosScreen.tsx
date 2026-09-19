import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import BranchPicker from '../components/BranchPicker'
import CatalogGrid from '../components/pos/CatalogGrid'
import CustomerPicker from '../components/pos/CustomerPicker'
import DepartmentList from '../components/pos/DepartmentList'
import ScanTicket from '../components/pos/ScanTicket'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useBusinessModules } from '../hooks/useBusinessModules'
import { useEnabledPaymentMethods } from '../hooks/useBranchPaymentMethods'
import type { Customer } from '../hooks/useCustomers'
import { usePosCatalog } from '../hooks/usePosCatalog'
import { usePosLayout } from '../hooks/usePosLayout'
import { useCreateSale } from '../hooks/useCreateSale'
import { useLabels } from '../hooks/useLabels'
import { fetchSaleReceipt } from '../hooks/useSaleReceipt'
import { printReceipt } from '../printing/printReceipt'
import { usePairedPrinter } from '../printing/printerStorage'
import { shareReceiptPdf } from '../printing/receiptPdf'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
import PendingSyncBanner from '../offline/PendingSyncBanner'
import type { CartLine, CatalogItem, PaymentMethod } from '../types'
import { getErrorMessage } from '../utils/getErrorMessage'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  fiado: 'Fiado',
}

export default function PosScreen() {
  const activeBranchId = useActiveBranch()
  const labels = useLabels()
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const { data: posLayout = 'catalogo' } = usePosLayout()
  const { data: modules } = useBusinessModules()
  const {
    data: catalog,
    isLoading: loadingCatalog,
    error: catalogError,
  } = usePosCatalog(activeBranchId, modules)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [cartOpen, setCartOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [splitMode, setSplitMode] = useState(false)
  const [splitLines, setSplitLines] = useState<{ method: PaymentMethod; amount: string }[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  const createSale = useCreateSale()
  const { data: pairedPrinter } = usePairedPrinter()
  const { data: enabledMethods } = useEnabledPaymentMethods(activeBranchId)

  useEffect(() => {
    if (!enabledMethods?.length) return
    if (splitMode) {
      const stillValid = splitLines.every((line) => enabledMethods.includes(line.method))
      if (!stillValid) {
        setSplitMode(false)
        setSplitLines([])
        setPaymentMethod(enabledMethods[0])
      }
    } else if (!enabledMethods.includes(paymentMethod)) {
      setPaymentMethod(enabledMethods[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledMethods])

  const filteredCatalog = useMemo(() => {
    if (!catalog) return []
    const term = search.trim().toLowerCase()
    if (!term) return catalog
    return catalog.filter((item) => item.name.toLowerCase().includes(term))
  }, [catalog, search])

  const cartLines = useMemo(() => Array.from(cart.values()), [cart])
  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)

  const effectivePayments: { method: PaymentMethod; amount: number }[] = splitMode
    ? splitLines.map((line) => ({ method: line.method, amount: parseFloat(line.amount) || 0 }))
    : [{ method: paymentMethod, amount: total }]
  const paidTotal = round2(effectivePayments.reduce((sum, p) => sum + p.amount, 0))
  const remaining = round2(total - paidTotal)
  const hasFiado = effectivePayments.some((p) => p.method === 'fiado' && p.amount > 0)

  function enableSplit() {
    const other = (enabledMethods ?? []).find((m) => m !== paymentMethod)
    if (!other) return
    setSplitLines([
      { method: paymentMethod, amount: '' },
      { method: other, amount: '' },
    ])
    setSplitMode(true)
  }

  function cancelSplit() {
    setPaymentMethod(splitLines[0]?.method ?? paymentMethod)
    setSplitMode(false)
    setSplitLines([])
  }

  function cycleSplitLineMethod(index: number) {
    const used = new Set(splitLines.filter((_, i) => i !== index).map((l) => l.method))
    const options = (enabledMethods ?? []).filter((m) => !used.has(m))
    if (options.length < 2) return
    const current = splitLines[index].method
    const next = options[(options.indexOf(current) + 1) % options.length]
    setSplitLines((prev) => prev.map((line, i) => (i === index ? { ...line, method: next } : line)))
  }

  function updateSplitLineAmount(index: number, amount: string) {
    setSplitLines((prev) => prev.map((line, i) => (i === index ? { ...line, amount } : line)))
  }

  function addSplitLine() {
    const used = new Set(splitLines.map((line) => line.method))
    const next = (enabledMethods ?? []).find((m) => !used.has(m))
    if (!next) return
    setSplitLines((prev) => [...prev, { method: next, amount: '' }])
  }

  function removeSplitLine(index: number) {
    setSplitLines((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length <= 1) {
        setSplitMode(false)
        setPaymentMethod(next[0]?.method ?? paymentMethod)
        return []
      }
      return next
    })
  }

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(item.id)
      next.set(item.id, { item, quantity: (existing?.quantity ?? 0) + 1 })
      return next
    })
  }

  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) => {
      const next = new Map(prev)
      if (quantity <= 0) {
        next.delete(itemId)
        return next
      }
      const existing = next.get(itemId)
      if (existing) next.set(itemId, { ...existing, quantity })
      return next
    })
  }

  function handleCheckout() {
    if (!activeBranchId || cartLines.length === 0) return
    if (hasFiado && !customer) return
    if (splitMode && (remaining !== 0 || effectivePayments.some((p) => p.amount <= 0))) return
    setFeedback(null)
    createSale.mutate(
      { branchId: activeBranchId, cartLines, payments: effectivePayments, customerId: customer?.id },
      {
        onSuccess: ({ saleId, folio, queued }) => {
          setFeedback({
            type: 'success',
            text: queued
              ? 'Venta guardada — se sincronizará cuando regrese la conexión'
              : folio
                ? `Venta registrada — folio ${folio}`
                : 'Venta registrada',
          })
          // Una venta encolada offline no tiene folio todavía y sus datos
          // (negocio/sucursal) tampoco están garantizados sin conexión —
          // el ticket solo se puede imprimir de inmediato si sí se
          // registró en el servidor.
          setLastSaleId(queued ? null : saleId)
          setCart(new Map())
          setCustomer(null)
          setSplitMode(false)
          setSplitLines([])
          setTimeout(() => {
            setCartOpen(false)
            setFeedback(null)
          }, queued ? 2200 : 1200)
        },
        onError: (error) => {
          setFeedback({
            type: 'error',
            text: getErrorMessage(error, 'No se pudo registrar la venta'),
          })
        },
      },
    )
  }

  async function handlePrint() {
    if (!lastSaleId) return
    setPrinting(true)
    try {
      const receipt = await fetchSaleReceipt(lastSaleId)
      if (pairedPrinter) {
        await printReceipt(receipt)
      } else {
        await shareReceiptPdf(receipt)
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(error, 'No se pudo generar el ticket'),
      })
    } finally {
      setPrinting(false)
    }
  }

  if (!activeBranchId) {
    return (
      <SafeAreaView style={styles.container}>
        <BranchPicker title="Elige una sucursal para vender" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <PendingSyncBanner />
      <View style={styles.header}>
        <Text style={styles.title}>{labels.posTitle}</Text>
        {posLayout !== 'abarrotes' && (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto o servicio…"
            placeholderTextColor={colors.placeholder}
            style={styles.search}
          />
        )}
      </View>

      {loadingCatalog && <ActivityIndicator style={styles.loading} color={palette.primary} />}
      {!!catalogError && <Text style={styles.errorText}>No se pudo cargar el catálogo.</Text>}

      {posLayout === 'ferreteria' && (
        <DepartmentList items={filteredCatalog} onAdd={addToCart} palette={palette} />
      )}
      {posLayout === 'abarrotes' && (
        <ScanTicket
          items={filteredCatalog}
          search={search}
          setSearch={setSearch}
          onAdd={addToCart}
          total={total}
          palette={palette}
        />
      )}
      {posLayout === 'catalogo' && (
        <CatalogGrid
          items={filteredCatalog}
          loading={loadingCatalog}
          onAdd={addToCart}
          palette={palette}
        />
      )}

      <TouchableOpacity style={styles.cartBar} activeOpacity={0.85} onPress={() => setCartOpen(true)}>
        <Text style={styles.cartBarText}>
          {cartLines.length > 0 ? `${cartLines.length} · ${currency.format(total)}` : 'Carrito vacío'}
        </Text>
        <Text style={styles.cartBarAction}>Ver carrito ▴</Text>
      </TouchableOpacity>

      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTap} onPress={() => setCartOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Carrito</Text>

            <FlatList
              data={cartLines}
              keyExtractor={(line) => line.item.id}
              style={styles.cartList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Aún no hay productos agregados.</Text>
              }
              renderItem={({ item: line }) => (
                <View style={styles.cartRow}>
                  <View style={styles.cartRowInfo}>
                    <Text style={styles.cartRowName} numberOfLines={1}>
                      {line.item.name}
                    </Text>
                    <Text style={styles.cartRowUnit}>{currency.format(line.item.price)} c/u</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      activeOpacity={0.6}
                      onPress={() => updateQuantity(line.item.id, line.quantity - 1)}
                    >
                      <Text style={styles.qtyButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{line.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      activeOpacity={0.6}
                      onPress={() => updateQuantity(line.item.id, line.quantity + 1)}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, { color: palette.dark }]}>
                {currency.format(total)}
              </Text>
            </View>

            {!splitMode && (
              <>
                <View style={styles.paymentRow}>
                  {(enabledMethods ?? ['cash', 'card', 'transfer']).map((method) => {
                    const active = paymentMethod === method
                    return (
                      <TouchableOpacity
                        key={method}
                        activeOpacity={0.75}
                        onPress={() => setPaymentMethod(method)}
                        style={[
                          styles.paymentChip,
                          active && { borderColor: palette.primary, backgroundColor: palette.tint },
                        ]}
                      >
                        <Text
                          style={[styles.paymentChipText, active && { color: palette.dark }]}
                        >
                          {PAYMENT_METHOD_LABEL[method]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {cartLines.length > 0 && (enabledMethods?.length ?? 0) > 1 && (
                  <TouchableOpacity onPress={enableSplit} style={styles.splitToggle}>
                    <Text style={[styles.splitToggleText, { color: palette.dark }]}>
                      + Dividir el pago entre dos métodos
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {splitMode && (
              <View style={styles.splitBlock}>
                <View style={styles.splitHeader}>
                  <Text style={styles.splitHeaderText}>Dividir pago</Text>
                  <TouchableOpacity onPress={cancelSplit}>
                    <Text style={styles.splitCancelText}>Cancelar división</Text>
                  </TouchableOpacity>
                </View>

                {splitLines.map((line, index) => (
                  <View key={index} style={styles.splitLineRow}>
                    <TouchableOpacity
                      style={styles.splitMethodChip}
                      onPress={() => cycleSplitLineMethod(index)}
                    >
                      <Text style={styles.splitMethodChipText}>
                        {PAYMENT_METHOD_LABEL[line.method]}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      value={line.amount}
                      onChangeText={(text) => updateSplitLineAmount(index, text)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.placeholder}
                      style={styles.splitAmountInput}
                    />
                    {splitLines.length > 2 && (
                      <TouchableOpacity onPress={() => removeSplitLine(index)} hitSlop={8}>
                        <Text style={styles.splitRemoveText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {(enabledMethods?.length ?? 0) > splitLines.length && (
                  <TouchableOpacity onPress={addSplitLine}>
                    <Text style={[styles.splitToggleText, { color: palette.dark }]}>
                      + Agregar método
                    </Text>
                  </TouchableOpacity>
                )}

                <Text
                  style={[
                    styles.splitRemainingText,
                    { color: remaining === 0 ? colors.success : colors.danger },
                  ]}
                >
                  {remaining === 0
                    ? 'Montos completos'
                    : remaining > 0
                      ? `Falta ${currency.format(remaining)}`
                      : `Sobra ${currency.format(Math.abs(remaining))}`}
                </Text>
              </View>
            )}

            {hasFiado && (
              <View style={styles.customerBlock}>
                <CustomerPicker value={customer} onChange={setCustomer} />
              </View>
            )}

            {feedback && (
              <View style={styles.feedbackBlock}>
                <Text
                  style={[
                    styles.feedback,
                    feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                  ]}
                >
                  {feedback.text}
                </Text>
                {lastSaleId && (
                  <TouchableOpacity onPress={handlePrint} disabled={printing}>
                    <Text
                      style={[
                        styles.printLink,
                        { color: palette.dark },
                        printing && styles.printLinkDisabled,
                      ]}
                    >
                      {printing
                        ? 'Generando…'
                        : pairedPrinter
                          ? 'Imprimir ticket'
                          : 'Generar PDF del ticket'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: palette.primary },
                (cartLines.length === 0 ||
                  createSale.isPending ||
                  (splitMode && (remaining !== 0 || effectivePayments.some((p) => p.amount <= 0))) ||
                  (hasFiado && !customer)) &&
                  styles.checkoutButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={
                cartLines.length === 0 ||
                createSale.isPending ||
                (splitMode && (remaining !== 0 || effectivePayments.some((p) => p.amount <= 0))) ||
                (hasFiado && !customer)
              }
              onPress={handleCheckout}
            >
              {createSale.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutButtonText}>Cobrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    search: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    loading: {
      marginTop: 24,
    },
    errorText: {
      color: colors.danger,
      textAlign: 'center',
      marginTop: 12,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
    },
    cartBar: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 16,
      backgroundColor: '#0f172a',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    cartBarText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    cartBarAction: {
      color: '#93c5fd',
      fontSize: 13,
      fontWeight: '600',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalBackdropTap: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: '85%',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    cartList: {
      maxHeight: 260,
    },
    cartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    cartRowInfo: {
      flex: 1,
      marginRight: 8,
    },
    cartRowName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    cartRowUnit: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    qtyControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    qtyButton: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    qtyValue: {
      minWidth: 20,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    paymentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    paymentChip: {
      minWidth: '30%',
      flexGrow: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    customerBlock: {
      marginTop: 12,
    },
    splitToggle: {
      marginTop: 8,
    },
    splitToggleText: {
      fontSize: 12,
      fontWeight: '700',
    },
    splitBlock: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    splitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    splitHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    splitCancelText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    splitLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    splitMethodChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    splitMethodChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    splitAmountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.text,
    },
    splitRemoveText: {
      fontSize: 18,
      color: colors.textMuted,
      paddingHorizontal: 4,
    },
    splitRemainingText: {
      fontSize: 12,
      fontWeight: '600',
    },
    paymentChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    feedbackBlock: {
      marginTop: 12,
      alignItems: 'center',
    },
    feedback: {
      fontSize: 13,
      textAlign: 'center',
    },
    feedbackSuccess: {
      color: colors.success,
    },
    feedbackError: {
      color: colors.danger,
    },
    printLink: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textDecorationLine: 'underline',
    },
    printLinkDisabled: {
      opacity: 0.5,
    },
    checkoutButton: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    checkoutButtonDisabled: {
      opacity: 0.5,
    },
    checkoutButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  })
}
