import { useRef } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { CatalogItem } from '../../types'
import type { BrandPalette } from '../../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../../theme/useThemeColors'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "abarrotes": el flujo es escanear/teclear un código de barras y
// presionar Enter (como un lector físico conectado por Bluetooth, que en
// iOS/Android se comporta como teclado) en vez de buscar visualmente — el
// total queda en grande junto al campo para confirmar de un vistazo
// mientras se sigue escaneando.
export default function ScanTicket({
  items,
  search,
  setSearch,
  onAdd,
  total,
  palette,
}: {
  items: CatalogItem[]
  search: string
  setSearch: (value: string) => void
  onAdd: (item: CatalogItem) => void
  total: number
  palette: BrandPalette
}) {
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const inputRef = useRef<TextInput>(null)

  function handleAdd(item: CatalogItem) {
    if (item.itemType === 'product' && (item.stock ?? 0) <= 0) return
    onAdd(item)
    setSearch('')
    inputRef.current?.focus()
  }

  function handleSubmit() {
    const term = search.trim()
    if (!term) return
    const exactBarcode = items.find((item) => item.barcode === term)
    const match = exactBarcode ?? items[0]
    if (match) handleAdd(match)
  }

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        autoFocus
        placeholder="Escanea o escribe un código/nombre…"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
      />

      <View style={[styles.totalBox, { backgroundColor: palette.tint }]}>
        <Text style={[styles.totalLabel, { color: palette.primary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: palette.dark }]}>{currency.format(total)}</Text>
      </View>

      {search.trim().length > 0 && (
        <FlatList
          data={items.slice(0, 8)}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          style={styles.matches}
          ListEmptyComponent={<Text style={styles.emptyText}>Sin coincidencias.</Text>}
          renderItem={({ item }) => {
            const disabled = item.itemType === 'product' && (item.stock ?? 0) <= 0
            return (
              <TouchableOpacity
                disabled={disabled}
                activeOpacity={0.7}
                onPress={() => handleAdd(item)}
                style={[styles.matchRow, disabled && styles.matchRowDisabled]}
              >
                <Text style={styles.matchName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.matchPrice, { color: palette.dark }]}>
                  {currency.format(item.price)}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    totalBox: {
      borderRadius: 16,
      alignItems: 'center',
      paddingVertical: 22,
      marginTop: 16,
    },
    totalLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    totalValue: {
      fontSize: 40,
      fontWeight: '800',
      marginTop: 4,
    },
    matches: {
      marginTop: 16,
    },
    matchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },
    matchRowDisabled: {
      opacity: 0.4,
    },
    matchName: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      marginRight: 8,
    },
    matchPrice: {
      fontSize: 14,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 12,
    },
  })
}
