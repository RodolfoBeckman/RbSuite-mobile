import type { ReactNode } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// Mismo comportamiento que el Modal de la web: cerrar con la "X" no pide
// confirmación (el usuario ya decidió), pero si hay datos capturados
// (isDirty) y el sistema intenta cerrar por otra vía (botón atrás en
// Android), se confirma antes de perderlos.
export default function FormModal({
  title,
  onClose,
  isDirty,
  children,
}: {
  title: string
  onClose: () => void
  isDirty?: boolean
  children: ReactNode
}) {
  function requestClose() {
    if (isDirty) {
      Alert.alert('¿Cerrar sin guardar?', 'Se perderá lo que capturaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Cerrar', style: 'destructive', onPress: onClose },
      ])
      return
    }
    onClose()
  }

  return (
    <Modal visible animationType="slide" onRequestClose={requestClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeText: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  content: {
    padding: 16,
    gap: 10,
  },
})
