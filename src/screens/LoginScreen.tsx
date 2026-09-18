import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useBrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'

export default function LoginScreen() {
  const colors = useThemeColors()
  const palette = useBrandPalette()
  const styles = createStyles(colors)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError('Correo o contraseña incorrectos.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>RB Suite</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@negocio.com"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: palette.primary },
            submitting && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !email || !password}
          activeOpacity={0.75}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 24,
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    error: {
      color: colors.danger,
      marginBottom: 12,
      fontSize: 13,
    },
    button: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
  })
}
