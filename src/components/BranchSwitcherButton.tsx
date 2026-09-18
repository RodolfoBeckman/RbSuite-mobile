import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'
import { useBranches } from '../hooks/useBranches'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'

// Botón siempre visible en el header (no solo la primera vez que no hay
// sucursal elegida) para que Administrador/Gerente puedan cambiar de
// sucursal en cualquier momento — incluso sin conexión, porque
// useBranches() ya cae al cache de AsyncStorage cuando el fetch falla
// (ver src/offline/branchesCache.ts). El Vendedor tiene sucursal fija en
// su membership y nunca ve este botón, igual que nunca veía BranchPicker.
export default function BranchSwitcherButton() {
  const { membership, activeBranchId, setActiveBranchId } = useAuth()
  const { data: branches, isLoading } = useBranches()
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const [open, setOpen] = useState(false)

  const currentName = useMemo(
    () => branches?.find((branch) => branch.id === activeBranchId)?.name ?? null,
    [branches, activeBranchId],
  )

  if (membership?.branchId) return null

  return (
    <>
      <TouchableOpacity style={styles.button} activeOpacity={0.75} onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={styles.buttonText} numberOfLines={1}>
          📍 {currentName ?? 'Elegir sucursal'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropTap} onPress={() => setOpen(false)} />
          <View style={styles.card}>
            <Text style={styles.title}>Cambiar sucursal</Text>
            {isLoading && !branches ? (
              <ActivityIndicator color={palette.primary} />
            ) : (
              <View style={styles.list}>
                {branches?.map((branch) => {
                  const active = branch.id === activeBranchId
                  return (
                    <TouchableOpacity
                      key={branch.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setActiveBranchId(branch.id)
                        setOpen(false)
                      }}
                      style={[
                        styles.branchRow,
                        active && { borderColor: palette.primary, backgroundColor: palette.tint },
                      ]}
                    >
                      <Text style={[styles.branchRowText, active && { color: palette.dark }]}>
                        {branch.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
                {!branches?.length && (
                  <Text style={styles.emptyText}>No hay sucursales disponibles.</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      marginLeft: 12,
      maxWidth: 140,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    backdropTap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    list: {
      gap: 8,
    },
    branchRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    branchRowText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 14,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 12,
    },
  })
}
