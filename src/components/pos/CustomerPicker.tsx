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
import FormModal from '../FormModal'
import { useCreateCustomer, useSearchCustomers, type Customer } from '../../hooks/useCustomers'
import { useBrandPalette } from '../../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../../theme/useThemeColors'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Buscador de cliente para la venta a fiado, con alta rápida sin salir
// del flujo de venta — picker de pantalla completa como ComboCreateSelect,
// pero con su propio modal de creación (nombre + teléfono, dos campos en
// vez de uno).
export default function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null
  onChange: (customer: Customer | null) => void
}) {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })

  const { data: results, isLoading } = useSearchCustomers(query)
  const createCustomer = useCreateCustomer()

  function openCreateModal() {
    setNewCustomer({ name: query.trim(), phone: '' })
    setShowCreate(true)
  }

  function handleCreate() {
    if (!newCustomer.name.trim()) return
    createCustomer.mutate(
      { name: newCustomer.name.trim(), phone: newCustomer.phone.trim() },
      {
        onSuccess: (customer) => {
          onChange(customer)
          setShowCreate(false)
          setOpen(false)
        },
      },
    )
  }

  return (
    <View>
      <Text style={styles.label}>Cliente</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setQuery('')
          setOpen(true)
        }}
        style={styles.field}
      >
        <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>
          {value?.name ?? 'Buscar cliente…'}
        </Text>
      </TouchableOpacity>
      {value && (
        <Text style={styles.balanceText}>
          Saldo actual: {currency.format(value.balance)}
          {value.creditLimit != null && ` de ${currency.format(value.creditLimit)} límite`}
        </Text>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nombre o teléfono…"
              placeholderTextColor={colors.placeholder}
              style={styles.searchInput}
            />
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={[styles.closeText, { color: palette.primary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {isLoading && <ActivityIndicator style={styles.loading} color={palette.primary} />}

          <FlatList
            data={results ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onChange(item)
                  setOpen(false)
                }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
                {item.phone && <Text style={styles.optionSubtext}>{item.phone}</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isLoading && query.trim().length > 0 ? (
                <Text style={styles.emptyText}>Sin resultados</Text>
              ) : null
            }
            ListFooterComponent={
              query.trim().length > 0 ? (
                <TouchableOpacity style={styles.createOption} onPress={openCreateModal}>
                  <Text style={[styles.createOptionText, { color: palette.dark }]}>
                    + Nuevo cliente
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </Modal>

      {showCreate && (
        <FormModal
          title="Nuevo cliente"
          onClose={() => setShowCreate(false)}
          isDirty={!!newCustomer.name || !!newCustomer.phone}
        >
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            autoFocus
            value={newCustomer.name}
            onChangeText={(text) => setNewCustomer((p) => ({ ...p, name: text }))}
            style={styles.input}
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.label}>Teléfono (opcional)</Text>
          <TextInput
            value={newCustomer.phone}
            onChangeText={(text) => setNewCustomer((p) => ({ ...p, phone: text }))}
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: palette.primary },
              (!newCustomer.name.trim() || createCustomer.isPending) && styles.disabled,
            ]}
            disabled={!newCustomer.name.trim() || createCustomer.isPending}
            onPress={handleCreate}
          >
            <Text style={styles.saveButtonText}>
              {createCustomer.isPending ? 'Creando…' : 'Crear cliente'}
            </Text>
          </TouchableOpacity>
        </FormModal>
      )}
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    field: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    fieldValue: {
      fontSize: 14,
      color: colors.text,
    },
    fieldPlaceholder: {
      fontSize: 14,
      color: colors.placeholder,
    },
    balanceText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textMuted,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingTop: 48,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    closeText: {
      fontWeight: '600',
      fontSize: 14,
    },
    loading: {
      marginTop: 16,
    },
    option: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    optionText: {
      fontSize: 14,
      color: colors.text,
    },
    optionSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyText: {
      padding: 16,
      color: colors.textMuted,
      fontSize: 13,
    },
    createOption: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    createOptionText: {
      fontSize: 14,
      fontWeight: '600',
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
      marginBottom: 4,
    },
    saveButton: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    disabled: {
      opacity: 0.5,
    },
  })
}
