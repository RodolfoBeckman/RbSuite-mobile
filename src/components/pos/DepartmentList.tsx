import { useMemo } from 'react'
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { CatalogItem } from '../../types'
import type { BrandPalette } from '../../theme/useBrandPalette'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "ferreteria": muchos SKUs organizados por departamento
// (categories, ya por-negocio) en una lista densa en vez de tarjetas —
// prioriza ver más renglones de un vistazo sobre el detalle visual.
export default function DepartmentList({
  items,
  onAdd,
  palette,
}: {
  items: CatalogItem[]
  onAdd: (item: CatalogItem) => void
  palette: BrandPalette
}) {
  const sections = useMemo(() => {
    const byDept = new Map<string, CatalogItem[]>()
    for (const item of items) {
      const dept = item.categoryName ?? 'Sin categoría'
      const list = byDept.get(dept) ?? []
      list.push(item)
      byDept.set(dept, list)
    }
    return Array.from(byDept.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }))
  }, [items])

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.itemType}-${item.id}`}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, { color: palette.dark, backgroundColor: palette.tint }]}>
          {section.title}
        </Text>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>Sin resultados.</Text>}
      renderItem={({ item }) => {
        const disabled = item.itemType === 'product' && (item.stock ?? 0) <= 0
        return (
          <TouchableOpacity
            disabled={disabled}
            activeOpacity={0.65}
            onPress={() => onAdd(item)}
            style={[styles.row, disabled && styles.rowDisabled]}
          >
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.itemType === 'product' && (
              <Text style={styles.rowStock}>Stock: {item.stock}</Text>
            )}
            <Text style={[styles.rowPrice, { color: palette.dark }]}>
              {currency.format(item.price)}
            </Text>
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
  sectionHeader: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowStock: {
    fontSize: 11,
    color: '#94a3b8',
    marginRight: 10,
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
})
