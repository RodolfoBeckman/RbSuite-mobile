import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { usePendingQueue } from './usePendingQueue'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'

const KIND_LABEL: Record<string, string> = {
  create_sale: 'Venta',
  open_cash_session: 'Apertura de caja',
  register_cash_movement: 'Movimiento de caja',
}

// Barra de estado de sincronización — para que nunca sea "magia
// invisible": el cajero/admin siempre puede ver cuántas acciones están
// por sincronizar, forzar un reintento, o descartar algo que se rechazó
// de forma permanente (ej. venta con stock insuficiente al sincronizar).
export default function PendingSyncBanner() {
  const { pendingCount, failed, retryNow, discard } = usePendingQueue()
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)

  if (pendingCount === 0 && failed.length === 0) return null

  return (
    <View style={styles.container}>
      {pendingCount > 0 && (
        <View style={[styles.row, { backgroundColor: palette.tint }]}>
          <Text style={[styles.rowText, { color: palette.dark }]}>
            {pendingCount === 1 ? '1 acción por sincronizar' : `${pendingCount} acciones por sincronizar`}
          </Text>
          <TouchableOpacity onPress={retryNow} activeOpacity={0.75}>
            <Text style={[styles.retryText, { color: palette.dark }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      {failed.map((item) => (
        <View key={item.id} style={[styles.row, { backgroundColor: colors.dangerTint }]}>
          <View style={styles.failedInfo}>
            <Text style={[styles.rowText, { color: colors.danger }]}>
              {KIND_LABEL[item.kind] ?? item.kind} no se pudo sincronizar
            </Text>
            {item.lastError && (
              <Text style={[styles.failedDetail, { color: colors.danger }]} numberOfLines={2}>
                {item.lastError}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => discard(item.id)} activeOpacity={0.75}>
            <Text style={[styles.retryText, { color: colors.danger }]}>Descartar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    rowText: {
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    failedInfo: {
      flex: 1,
      marginRight: 8,
    },
    failedDetail: {
      fontSize: 11,
      marginTop: 2,
      opacity: 0.85,
    },
    retryText: {
      fontSize: 12,
      fontWeight: '700',
    },
  })
}
