import { DEFAULT_PRIMARY_COLOR, useBranding } from '../hooks/useBranding'

// percent negativo oscurece, positivo aclara — mismo truco que usa la web
// (src/theme/brandColor.ts) para derivar una paleta completa a partir del
// único color que el Administrador elige.
function shade(hex: string, percent: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export interface BrandPalette {
  primary: string
  dark: string
  light: string
  tint: string
}

const DEFAULT_PALETTE: BrandPalette = {
  primary: DEFAULT_PRIMARY_COLOR,
  dark: shade(DEFAULT_PRIMARY_COLOR, -25),
  light: shade(DEFAULT_PRIMARY_COLOR, 35),
  tint: shade(DEFAULT_PRIMARY_COLOR, 85),
}

// React Native no tiene CSS custom properties — a diferencia de la web,
// aquí cada pantalla tiene que pedir la paleta y mezclarla con su
// StyleSheet estático vía arrays de estilo (`[styles.x, { color: ... }]`).
export function useBrandPalette(): BrandPalette {
  const { data: branding } = useBranding()
  if (!branding?.primaryColor) return DEFAULT_PALETTE

  const primary = branding.primaryColor
  return {
    primary,
    dark: shade(primary, -25),
    light: shade(primary, 35),
    tint: shade(primary, 85),
  }
}
