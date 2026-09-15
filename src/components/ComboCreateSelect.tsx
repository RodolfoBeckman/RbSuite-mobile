import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export interface ComboItem {
  id: string
  name: string
}

// Selector con búsqueda que además deja crear un valor nuevo sin salir del
// formulario — usado para marca/unidad/categoría/familia. En web es un
// dropdown flotante; en móvil se abre como un picker de pantalla completa
// (más natural para tocar y para el teclado) con el mismo comportamiento.
export default function ComboCreateSelect({
  label,
  items,
  value,
  onChange,
  onCreate,
  placeholder,
  disabled,
}: {
  label?: string
  items: ComboItem[]
  value: string | null
  onChange: (id: string | null) => void
  onCreate: (name: string) => Promise<ComboItem>
  placeholder?: string
  disabled?: boolean
}) {
  const selected = items.find((item) => item.id === value) ?? null
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const term = query.trim().toLowerCase()
  const filtered = term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items
  const exactMatch = items.some((item) => item.name.toLowerCase() === term)

  async function handleCreate() {
    if (!query.trim() || creating) return
    setCreating(true)
    try {
      const created = await onCreate(query.trim())
      onChange(created.id)
      setOpen(false)
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        disabled={disabled}
        onPress={() => {
          setQuery('')
          setOpen(true)
        }}
        style={[styles.field, disabled && styles.fieldDisabled]}
      >
        <Text style={selected ? styles.fieldValue : styles.fieldPlaceholder}>
          {selected?.name ?? placeholder ?? 'Seleccionar'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder ?? 'Buscar…'}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Sin resultados</Text>}
            ListFooterComponent={
              query.trim() && !exactMatch ? (
                <TouchableOpacity
                  style={styles.createOption}
                  disabled={creating}
                  onPress={handleCreate}
                >
                  {creating ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <Text style={styles.createOptionText}>+ Agregar "{query.trim()}"</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  field: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldValue: {
    fontSize: 14,
    color: '#0f172a',
  },
  fieldPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  closeText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 14,
    color: '#0f172a',
  },
  emptyText: {
    padding: 16,
    color: '#94a3b8',
    fontSize: 13,
  },
  createOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  createOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
  },
})
