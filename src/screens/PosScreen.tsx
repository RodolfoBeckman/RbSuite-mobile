import { useMemo, useState } from 'react'
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
import DepartmentList from '../components/pos/DepartmentList'
import ScanTicket from '../components/pos/ScanTicket'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useBusinessModules } from '../hooks/useBusinessModules'
import { usePosCatalog } from '../hooks/usePosCatalog'
import { usePosLayout } from '../hooks/usePosLayout'
import { useCreateSale } from '../hooks/useCreateSale'
import { useLabels } from '../hooks/useLabels'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
import type { CartLine, CatalogItem, PaymentMethod } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
]

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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const createSale = useCreateSale()

  const filteredCatalog = useMemo(() => {
    if (!catalog) return []
    const term = search.trim().toLowerCase()
    if (!term) return catalog
    return catalog.filter((item) => item.name.toLowerCase().includes(term))
  }, [catalog, search])

  const cartLines = useMemo(() => Array.from(cart.values()), [cart])
  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)

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
    setFeedback(null)
    createSale.mutate(
      { branchId: activeBranchId, cartLines, paymentMethod, total },
      {
        onSuccess: ({ folio }) => {
          setFeedback({
            type: 'success',
            text: folio ? `Venta registrada — folio ${folio}` : 'Venta registrada',
          })
          setCart(new Map())
          setTimeout(() => {
            setCartOpen(false)
            setFeedback(null)
          }, 1200)
        },
        onError: (error) => {
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo registrar la venta',
          })
        },
      },
    )
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

            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method.value
                return (
                  <TouchableOpacity
                    key={method.value}
                    activeOpacity={0.75}
                    onPress={() => setPaymentMethod(method.value)}
                    style={[
                      styles.paymentChip,
                      active && { borderColor: palette.primary, backgroundColor: palette.tint },
                    ]}
                  >
                    <Text
                      style={[styles.paymentChipText, active && { color: palette.dark }]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {feedback && (
              <Text
                style={[
                  styles.feedback,
                  feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                ]}
              >
                {feedback.text}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: palette.primary },
                (cartLines.length === 0 || createSale.isPending) && styles.checkoutButtonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={cartLines.length === 0 || createSale.isPending}
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
      gap: 8,
      marginTop: 12,
    },
    paymentChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    paymentChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    feedback: {
      marginTop: 12,
      fontSize: 13,
      textAlign: 'center',
    },
    feedbackSuccess: {
      color: colors.success,
    },
    feedbackError: {
      color: colors.danger,
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
