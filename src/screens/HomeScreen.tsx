import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'
import type { RootStackParamList } from '../../App'

const ROLE_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

// Punto de entrada tras el login: confirma sesión + membership (igual que
// la web) y da acceso a las pantallas de negocio. Caja/Dashboard quedan
// para una siguiente etapa.
export default function HomeScreen({ navigation }: Props) {
  const { session, membership, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RB Suite</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <View style={styles.card}>
        <Row label="Rol" value={membership ? ROLE_LABEL[membership.role] : 'Cargando…'} />
        <Row label="Negocio" value={membership?.businessId ?? 'Cargando…'} />
        <Row
          label="Sucursal"
          value={membership ? (membership.branchId ?? 'Todas las sucursales') : 'Cargando…'}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Pos')}>
        <Text style={styles.primaryButtonText}>Ir al Punto de venta</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Salir</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  rowValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  primaryButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  button: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  buttonText: {
    color: '#334155',
    fontWeight: '600',
  },
})
