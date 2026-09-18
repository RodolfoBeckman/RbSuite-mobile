import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'
import { useBranches } from '../hooks/useBranches'
import { useBrandPalette } from '../theme/useBrandPalette'

// Administrador y Gerente ven todas las sucursales (branch_id null en su
// membership), así que eligen desde cuál están operando antes de usar el
// POS. El Vendedor ya trae branch_id fijo y nunca ve esto. Mismo
// componente que la web.
export default function BranchPicker({ title }: { title: string }) {
  const { setActiveBranchId } = useAuth()
  const { data: branches, isLoading } = useBranches()
  const palette = useBrandPalette()

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator color={palette.primary} />
      ) : (
        <View style={styles.list}>
          {branches?.map((branch) => (
            <TouchableOpacity
              key={branch.id}
              activeOpacity={0.75}
              onPress={() => setActiveBranchId(branch.id)}
              style={[styles.branchButton, { borderColor: palette.primary }]}
            >
              <Text style={[styles.branchButtonText, { color: palette.dark }]}>
                {branch.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  branchButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  branchButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
})
