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
import { useActiveBranch } from '../hooks/useActiveBranch'
import { usePosCatalog } from '../hooks/usePosCatalog'
import { useCreateSale } from '../hooks/useCreateSale'
import { useLabels } from '../hooks/useLabels'
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
  const {
    data: catalog,
    isLoading: loadingCatalog,
    error: catalogError,
  } = usePosCatalog(activeBranchId)

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
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar producto o servicio…"
          placeholderTextColor="#94a3b8"
          style={styles.search}
        />
      </View>

      {loadingCatalog && <ActivityIndicator style={styles.loading} color="#2563eb" />}
      {!!catalogError && <Text style={styles.errorText}>No se pudo cargar el catálogo.</Text>}

      <FlatList
        data={filteredCatalog}
        keyExtractor={(item) => `${item.itemType}-${item.id}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loadingCatalog ? <Text style={styles.emptyText}>Sin resultados.</Text> : null
        }
        renderItem={({ item }) => {
          const outOfStock = item.itemType === 'product' && (item.stock ?? 0) <= 0
          return (
            <TouchableOpacity
              disabled={outOfStock}
              onPress={() => addToCart(item)}
              style={[styles.card, outOfStock && styles.cardDisabled]}
            >
              <Text style={styles.cardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.cardPrice}>{currency.format(item.price)}</Text>
              {item.itemType === 'product' && (
                <Text style={styles.cardStock}>Stock: {item.stock}</Text>
              )}
            </TouchableOpacity>
          )
        }}
      />

      <TouchableOpacity style={styles.cartBar} onPress={() => setCartOpen(true)}>
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
                      onPress={() => updateQuantity(line.item.id, line.quantity - 1)}
                    >
                      <Text style={styles.qtyButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{line.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
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
              <Text style={styles.totalValue}>{currency.format(total)}</Text>
            </View>

            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  onPress={() => setPaymentMethod(method.value)}
                  style={[
                    styles.paymentChip,
                    paymentMethod === method.value && styles.paymentChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      paymentMethod === method.value && styles.paymentChipTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
                (cartLines.length === 0 || createSale.isPending) && styles.checkoutButtonDisabled,
              ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  loading: {
    marginTop: 24,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 12,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 90,
  },
  row: {
    gap: 10,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    minHeight: 88,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  cardStock: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
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
    backgroundColor: '#cbd5e1',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    borderBottomColor: '#f1f5f9',
  },
  cartRowInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  cartRowUnit: {
    fontSize: 12,
    color: '#94a3b8',
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
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    fontSize: 16,
    color: '#475569',
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  paymentChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  paymentChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentChipTextActive: {
    color: '#1d4ed8',
  },
  feedback: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  feedbackSuccess: {
    color: '#16a34a',
  },
  feedbackError: {
    color: '#dc2626',
  },
  checkoutButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
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
