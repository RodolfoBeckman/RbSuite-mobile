import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import type { CatalogItem } from '../../types'
import type { BrandPalette } from '../../theme/useBrandPalette'

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

const styles = StyleSheet.create({
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
})
