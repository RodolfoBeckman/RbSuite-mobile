import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Appearance } from 'react-native'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'rb-suite-theme'

// Mismo patrón que la web (src/theme/ThemeContext.tsx): preferencia
// explícita del usuario si existe, si no el tema del sistema. AsyncStorage
// en vez de localStorage, Appearance en vez de matchMedia.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setTheme(stored)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    AsyncStorage.setItem(STORAGE_KEY, theme)
  }, [theme, loaded])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
