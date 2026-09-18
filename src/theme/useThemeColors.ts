import { useMemo } from 'react'
import { useTheme } from './ThemeContext'

// Misma escala de grises (slate) que ya se usaba fija en toda la app,
// solo que ahora con un juego claro y uno oscuro. Los nombres son
// semánticos (dónde se usa) en vez de la escala de Tailwind, para que
// cada pantalla pida "el fondo de tarjeta" sin tener que saber el tono
// exacto en cada tema.
export interface ThemeColors {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  divider: string
  text: string
  textSecondary: string
  textMuted: string
  placeholder: string
  danger: string
  dangerTint: string
  success: string
  successTint: string
  overlay: string
}

const LIGHT: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e2e8f0',
  divider: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  placeholder: '#94a3b8',
  danger: '#dc2626',
  dangerTint: '#fee2e2',
  success: '#16a34a',
  successTint: '#dcfce7',
  overlay: 'rgba(0,0,0,0.5)',
}

const DARK: ThemeColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#0f172a',
  border: '#334155',
  divider: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  placeholder: '#64748b',
  danger: '#f87171',
  dangerTint: '#450a0a',
  success: '#4ade80',
  successTint: '#052e16',
  overlay: 'rgba(0,0,0,0.7)',
}

export function useThemeColors(): ThemeColors {
  const { theme } = useTheme()
  return useMemo(() => (theme === 'dark' ? DARK : LIGHT), [theme])
}
