import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import type { CatalogItem } from '../../types'
import type { BrandPalette } from '../../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../../theme/useThemeColors'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "catalogo" (default): tarjetas visuales, pensado para catálogos
// chicos con mezcla de productos y servicios (ej. salones, boutiques).
export default function CatalogGrid({
  items,
  loading,
  onAdd,
  palette,
}: {
  items: CatalogItem[]
  loading: boolean
  onAdd: (item: CatalogItem) => void
  palette: BrandPalette
}) {
  const colors = useThemeColors()
  const styles = createStyles(colors)
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.itemType}-${item.id}`}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Sin resultados.</Text> : null}
      renderItem={({ item }) => {
        const outOfStock = item.itemType === 'product' && (item.stock ?? 0) <= 0
        return (
          <TouchableOpacity
            disabled={outOfStock}
            activeOpacity={0.7}
            onPress={() => onAdd(item)}
            style={[styles.card, outOfStock && styles.cardDisabled]}
          >
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.cardPrice, { color: palette.dark }]}>
              {currency.format(item.price)}
            </Text>
            {item.itemType === 'product' && (
              <Text style={styles.cardStock}>Stock: {item.stock}</Text>
            )}
          </TouchableOpacity>
        )
      }}
    />
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: {
      paddingHorizontal: 12,
      paddingBottom: 90,
    },
    row: {
      gap: 10,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      minHeight: 88,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardDisabled: {
      opacity: 0.4,
    },
    cardName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    cardPrice: {
      fontSize: 14,
      fontWeight: '700',
    },
    cardStock: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  })
}
