import { useState } from 'react'
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
import { useAuth } from '../auth/AuthContext'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useCashRegisters, useCurrentCashSession } from '../hooks/useCaja'
import {
  useAdjustCustomerBalance,
  useCustomer,
  useCustomerAccountMovements,
  useRecordCustomerPayment,
  useReportCustomerBalances,
  useSearchCustomers,
  type Customer,
} from '../hooks/useCustomers'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
import type { PaymentMethod } from '../types'
import { getErrorMessage } from '../utils/getErrorMessage'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const MOVEMENT_LABEL: Record<string, string> = {
  charge: 'Cargo',
  payment: 'Abono',
  adjustment: 'Ajuste',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  fiado: 'Fiado',
}

function RecordPaymentForm({ customerId, colors }: { customerId: string; colors: ThemeColors }) {
  const palette = useBrandPalette()
  const styles = createStyles(colors)
  const activeBranchId = useActiveBranch()
  const { data: registers } = useCashRegisters(activeBranchId)
  const register = registers?.[0] ?? null
  const { data: session } = useCurrentCashSession(register?.id ?? null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Exclude<PaymentMethod, 'fiado'>>('cash')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const recordPayment = useRecordCustomerPayment()

  function handleSubmit() {
    const value = Number(amount)
    if (!activeBranchId || Number.isNaN(value) || value <= 0) {
      setFeedback({ type: 'error', text: 'Ingresa un monto válido' })
      return
    }
    if (method === 'cash' && !session) {
      setFeedback({ type: 'error', text: 'Abre la caja de esta sucursal antes de registrar un abono en efectivo' })
      return
    }
    setFeedback(null)
    recordPayment.mutate(
      { customerId, branchId: activeBranchId, amount: value, paymentMethod: method, cashSessionId: session?.id ?? null },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Abono registrado' })
          setAmount('')
        },
        onError: (error) =>
          setFeedback({ type: 'error', text: getErrorMessage(error, 'No se pudo registrar el abono') }),
      },
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Registrar abono</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Monto"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
      />
      <View style={styles.chipRow}>
        {(['cash', 'card', 'transfer'] as const).map((option) => {
          const active = method === option
          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.75}
              onPress={() => setMethod(option)}
              style={[styles.chip, active && { borderColor: palette.primary, backgroundColor: palette.tint }]}
            >
              <Text style={[styles.chipText, active && { color: palette.dark }]}>
                {PAYMENT_LABEL[option]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: palette.primary }, recordPayment.isPending && styles.disabled]}
        disabled={recordPayment.isPending}
        onPress={handleSubmit}
      >
        <Text style={styles.saveButtonText}>{recordPayment.isPending ? 'Guardando…' : 'Registrar abono'}</Text>
      </TouchableOpacity>
      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>{feedback.text}</Text>
      )}
    </View>
  )
}

function AdjustBalanceForm({ customerId, colors }: { customerId: string; colors: ThemeColors }) {
  const palette = useBrandPalette()
  const styles = createStyles(colors)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const adjustBalance = useAdjustCustomerBalance()

  function handleSubmit() {
    const value = Number(amount)
    if (Number.isNaN(value) || value === 0) {
      setFeedback({ type: 'error', text: 'Ingresa un monto distinto de cero' })
      return
    }
    if (!reason.trim()) {
      setFeedback({ type: 'error', text: 'El motivo es obligatorio' })
      return
    }
    setFeedback(null)
    adjustBalance.mutate(
      { customerId, amount: value, reason: reason.trim() },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Saldo ajustado' })
          setAmount('')
          setReason('')
        },
        onError: (error) =>
          setFeedback({ type: 'error', text: getErrorMessage(error, 'No se pudo ajustar el saldo') }),
      },
    )
  }

  return (
    <View style={[styles.card, styles.dashedCard]}>
      <Text style={styles.cardTitle}>Ajustar / condonar saldo</Text>
      <Text style={styles.cardHint}>
        Monto negativo para condonar deuda (ej. -200), positivo para corregir un cargo de menos.
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numbers-and-punctuation"
        placeholder="Monto (+/-)"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
      />
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Motivo (obligatorio)"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
      />
      <TouchableOpacity
        style={[styles.secondaryButton, adjustBalance.isPending && styles.disabled]}
        disabled={adjustBalance.isPending}
        onPress={handleSubmit}
      >
        <Text style={styles.secondaryButtonText}>{adjustBalance.isPending ? 'Guardando…' : 'Ajustar saldo'}</Text>
      </TouchableOpacity>
      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>{feedback.text}</Text>
      )}
    </View>
  )
}

function CustomerDetailModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { membership } = useAuth()
  const canAdjust = membership?.role === 'administrador' || membership?.role === 'gerente'
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)

  const { data: customer, isLoading: loadingCustomer } = useCustomer(customerId)
  const { data: movements, isLoading: loadingMovements } = useCustomerAccountMovements(customerId)

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{customer?.name ?? 'Cliente'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.closeText, { color: palette.primary }]}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {loadingCustomer && <ActivityIndicator style={styles.loading} color={palette.primary} />}

        {customer && (
          <FlatList
            style={styles.modalBody}
            data={movements ?? []}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                <View style={styles.card}>
                  {customer.phone && <Text style={styles.cardHint}>{customer.phone}</Text>}
                  <Text style={styles.balanceText}>{currency.format(customer.balance)}</Text>
                  {customer.creditLimit != null && (
                    <Text style={styles.cardHint}>
                      Límite de crédito: {currency.format(customer.creditLimit)}
                    </Text>
                  )}
                </View>

                <RecordPaymentForm customerId={customerId} colors={colors} />
                {canAdjust && <AdjustBalanceForm customerId={customerId} colors={colors} />}

                <Text style={styles.sectionTitle}>Estado de cuenta</Text>
                {loadingMovements && <ActivityIndicator color={palette.primary} />}
                {!loadingMovements && !movements?.length && (
                  <Text style={styles.emptyText}>Sin movimientos todavía.</Text>
                )}
              </View>
            }
            renderItem={({ item: movement }) => (
              <View style={styles.movementRow}>
                <View style={styles.movementInfo}>
                  <Text style={styles.movementTitle}>
                    {MOVEMENT_LABEL[movement.type]}
                    {movement.saleFolio ? ` — folio ${movement.saleFolio}` : ''}
                    {movement.paymentMethod ? ` (${PAYMENT_LABEL[movement.paymentMethod]})` : ''}
                  </Text>
                  <Text style={styles.movementSubtext}>
                    {dateTime.format(new Date(movement.createdAt))} · {movement.branchName}
                    {movement.reason ? ` · ${movement.reason}` : ''}
                  </Text>
                </View>
                <Text style={movement.amount >= 0 ? styles.amountDanger : styles.amountSuccess}>
                  {movement.amount >= 0 ? '+' : ''}
                  {currency.format(movement.amount)}
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

export default function ClientesScreen() {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: balances, isLoading: loadingBalances } = useReportCustomerBalances()
  const { data: searchResults, isLoading: loadingSearch } = useSearchCustomers(search)
  const showingSearch = search.trim().length > 0

  const data: { id: string; name: string; phone: string | null; balance: number }[] = showingSearch
    ? (searchResults ?? []).map((c) => ({ id: c.id, name: c.name, phone: c.phone, balance: c.balance }))
    : (balances ?? []).map((c) => ({ id: c.customerId, name: c.name, phone: c.phone, balance: c.balance }))
  const loading = showingSearch ? loadingSearch : loadingBalances

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o teléfono…"
          placeholderTextColor={colors.placeholder}
          style={styles.search}
        />
        {!showingSearch && <Text style={styles.sectionLabel}>Cuentas por cobrar</Text>}
      </View>

      {loading && <ActivityIndicator style={styles.loading} color={palette.primary} />}

      <FlatList
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {showingSearch ? 'Sin resultados.' : 'Nadie debe nada por ahora.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setSelectedId(item.id)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.phone && <Text style={styles.rowSubtext}>{item.phone}</Text>}
            </View>
            <Text style={styles.amountDanger}>{currency.format(item.balance)}</Text>
          </TouchableOpacity>
        )}
      />

      {selectedId && (
        <CustomerDetailModal customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </SafeAreaView>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 10 },
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
    sectionLabel: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    loading: { marginTop: 12 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
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
    },
    rowInfo: { flex: 1, marginRight: 8 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
    amountDanger: { fontSize: 14, fontWeight: '700', color: colors.danger },
    amountSuccess: { fontSize: 14, fontWeight: '700', color: colors.success },
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    closeText: { fontWeight: '600', fontSize: 14 },
    modalBody: { flex: 1, padding: 16 },
    balanceText: { fontSize: 24, fontWeight: '700', color: colors.danger, marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    dashedCard: { borderStyle: 'dashed' },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
    cardHint: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    saveButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.5 },
    textSuccess: { color: colors.success, marginTop: 8, fontSize: 13 },
    textDanger: { color: colors.danger, marginTop: 8, fontSize: 13 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 8 },
    movementRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    movementInfo: { flex: 1, marginRight: 8 },
    movementTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
    movementSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  })
}
