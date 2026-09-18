import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import BranchPicker from '../components/BranchPicker'
import { useActiveBranch } from '../hooks/useActiveBranch'
import {
  useCashMovements,
  useCashRegisters,
  useCloseCashSession,
  useCreateCashRegister,
  useCurrentCashSession,
  useOpenCashSession,
  useRegisterCashMovement,
} from '../hooks/useCaja'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
import type { CashMovementType } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const MOVEMENT_LABEL: Record<string, string> = {
  sale: 'Venta',
  cash_in: 'Entrada',
  cash_out: 'Retiro',
  adjustment: 'Ajuste',
}

export default function CajaScreen() {
  const activeBranchId = useActiveBranch()
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const { data: registers, isLoading: loadingRegisters } = useCashRegisters(activeBranchId)
  const createRegister = useCreateCashRegister()

  // MVP: una caja por sucursal, igual que la web.
  const register = registers?.[0] ?? null

  const { data: session, isLoading: loadingSession } = useCurrentCashSession(register?.id ?? null)
  const { data: movements } = useCashMovements(session?.id ?? null)

  const openSession = useOpenCashSession()
  const closeSession = useCloseCashSession()
  const registerMovement = useRegisterCashMovement()

  const [openingAmount, setOpeningAmount] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementType, setMovementType] = useState<Exclude<CashMovementType, 'sale'>>('cash_out')
  const [movementReason, setMovementReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [closeResult, setCloseResult] = useState<{ expected: number; difference: number } | null>(
    null,
  )

  const runningTotal = useMemo(() => {
    if (!session) return 0
    const movementsSum = (movements ?? []).reduce((sum, m) => sum + m.amount, 0)
    return session.openingAmount + movementsSum
  }, [session, movements])

  if (!activeBranchId) {
    return (
      <SafeAreaView style={styles.container}>
        <BranchPicker title="Elige una sucursal para abrir caja" />
      </SafeAreaView>
    )
  }

  if (loadingRegisters) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={palette.primary} />
      </SafeAreaView>
    )
  }

  if (!register) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.standaloneWrap}>
          <View style={styles.card}>
          <Text style={styles.cardTitle}>Esta sucursal aún no tiene una caja registrada</Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: palette.primary },
              createRegister.isPending && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={createRegister.isPending}
            onPress={() =>
              createRegister.mutate({ branchId: activeBranchId, name: 'Caja principal' })
            }
          >
            {createRegister.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Crear caja principal</Text>
            )}
          </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (loadingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={palette.primary} />
      </SafeAreaView>
    )
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Abrir caja — {register.name}</Text>

            {closeResult && (
              <View style={[styles.infoBox, { backgroundColor: palette.tint }]}>
                <Text style={[styles.infoBoxText, { color: palette.dark }]}>
                  Última sesión — esperado: {currency.format(closeResult.expected)}
                </Text>
                <Text
                  style={[
                    styles.infoBoxText,
                    closeResult.difference > 0
                      ? styles.textSuccess
                      : closeResult.difference < 0
                        ? styles.textDanger
                        : { color: palette.dark },
                  ]}
                >
                  Diferencia: {currency.format(closeResult.difference)}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Fondo inicial</Text>
            <TextInput
              value={openingAmount}
              onChangeText={setOpeningAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />

            {feedback && (
              <Text
                style={[
                  styles.feedback,
                  feedback.type === 'success' ? styles.textSuccess : styles.textDanger,
                ]}
              >
                {feedback.text}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: palette.primary },
                openSession.isPending && styles.buttonDisabled,
              ]}
              activeOpacity={0.8}
              disabled={openSession.isPending}
              onPress={() => {
                const amount = Number(openingAmount)
                if (Number.isNaN(amount) || amount < 0) {
                  setFeedback({ type: 'error', text: 'Ingresa un fondo inicial válido' })
                  return
                }
                setFeedback(null)
                openSession.mutate(
                  { cashRegisterId: register.id, openingAmount: amount },
                  {
                    onSuccess: () => setOpeningAmount(''),
                    onError: (error) =>
                      setFeedback({
                        type: 'error',
                        text: error instanceof Error ? error.message : 'No se pudo abrir la caja',
                      }),
                  },
                )
              }}
            >
              {openSession.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Abrir caja</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{register.name}</Text>
          <Text style={styles.subtitle}>
            Abierta {new Date(session.openedAt).toLocaleString('es-MX')}
          </Text>

          <View style={[styles.totalBox, { backgroundColor: palette.tint }]}>
            <Text style={[styles.totalBoxLabel, { color: palette.dark }]}>
              Efectivo esperado ahora
            </Text>
            <Text style={[styles.totalBoxValue, { color: palette.dark }]}>
              {currency.format(runningTotal)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Movimiento manual</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMovementType('cash_in')}
              style={[
                styles.segmentButton,
                movementType === 'cash_in' && styles.segmentButtonSuccess,
              ]}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  movementType === 'cash_in' && styles.textSuccess,
                ]}
              >
                Entrada
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMovementType('cash_out')}
              style={[
                styles.segmentButton,
                movementType === 'cash_out' && styles.segmentButtonDanger,
              ]}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  movementType === 'cash_out' && styles.textDanger,
                ]}
              >
                Retiro
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={movementAmount}
            onChangeText={setMovementAmount}
            keyboardType="decimal-pad"
            placeholder="Monto"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
          <TextInput
            value={movementReason}
            onChangeText={setMovementReason}
            placeholder="Motivo (opcional)"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.secondaryButton, registerMovement.isPending && styles.buttonDisabled]}
            activeOpacity={0.7}
            disabled={registerMovement.isPending}
            onPress={() => {
              const amount = Number(movementAmount)
              if (Number.isNaN(amount) || amount <= 0) {
                setFeedback({ type: 'error', text: 'Ingresa un monto válido' })
                return
              }
              setFeedback(null)
              registerMovement.mutate(
                {
                  sessionId: session.id,
                  type: movementType,
                  amount,
                  reason: movementReason || undefined,
                },
                {
                  onSuccess: () => {
                    setMovementAmount('')
                    setMovementReason('')
                  },
                  onError: (error) =>
                    setFeedback({
                      type: 'error',
                      text:
                        error instanceof Error ? error.message : 'No se pudo registrar el movimiento',
                    }),
                },
              )
            }}
          >
            {registerMovement.isPending ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Registrar movimiento</Text>
            )}
          </TouchableOpacity>

          {feedback && (
            <Text
              style={[
                styles.feedback,
                feedback.type === 'success' ? styles.textSuccess : styles.textDanger,
              ]}
            >
              {feedback.text}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cerrar caja</Text>
          <Text style={styles.label}>Efectivo contado</Text>
          <TextInput
            value={countedAmount}
            onChangeText={setCountedAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />

          {countedAmount !== '' && !Number.isNaN(Number(countedAmount)) && (
            <Text style={styles.subtitle}>
              Diferencia estimada:{' '}
              <Text
                style={
                  Number(countedAmount) - runningTotal > 0
                    ? styles.textSuccess
                    : Number(countedAmount) - runningTotal < 0
                      ? styles.textDanger
                      : undefined
                }
              >
                {currency.format(Number(countedAmount) - runningTotal)}
              </Text>
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.darkButton,
              { backgroundColor: palette.dark },
              closeSession.isPending && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={closeSession.isPending}
            onPress={() => {
              const amount = Number(countedAmount)
              if (Number.isNaN(amount) || amount < 0) {
                setFeedback({ type: 'error', text: 'Ingresa el efectivo contado' })
                return
              }
              setFeedback(null)
              closeSession.mutate(
                { sessionId: session.id, cashRegisterId: register.id, countedAmount: amount },
                {
                  onSuccess: (result) => {
                    setCloseResult({
                      expected: result.expected_amount,
                      difference: result.difference,
                    })
                    setCountedAmount('')
                  },
                  onError: (error) =>
                    setFeedback({
                      type: 'error',
                      text: error instanceof Error ? error.message : 'No se pudo cerrar la caja',
                    }),
                },
              )
            }}
          >
            {closeSession.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Cerrar caja</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, styles.movementsTitle]}>
            Movimientos de la sesión
          </Text>
          {(movements ?? []).map((movement) => (
            <View key={movement.id} style={styles.movementRow}>
              <Text style={styles.movementLabel}>
                {MOVEMENT_LABEL[movement.type] ?? movement.type}
              </Text>
              <Text style={movement.amount >= 0 ? styles.textSuccess : styles.textDanger}>
                {currency.format(movement.amount)}
              </Text>
            </View>
          ))}
          {(!movements || movements.length === 0) && (
            <Text style={styles.emptyText}>Sin movimientos todavía.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    loading: {
      marginTop: 32,
    },
    standaloneWrap: {
      padding: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      marginBottom: 10,
    },
    infoBox: {
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
    },
    infoBoxText: {
      fontSize: 13,
    },
    totalBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    totalBoxLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    totalBoxValue: {
      fontSize: 17,
      fontWeight: '700',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    movementsTitle: {
      marginTop: 20,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    segmentButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    segmentButtonSuccess: {
      borderColor: colors.success,
    },
    segmentButtonDanger: {
      borderColor: colors.danger,
    },
    segmentButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    primaryButton: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 14,
    },
    darkButton: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    feedback: {
      marginTop: 10,
      fontSize: 13,
      textAlign: 'center',
    },
    textSuccess: {
      color: colors.success,
    },
    textDanger: {
      color: colors.danger,
    },
    movementRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    movementLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  })
}
