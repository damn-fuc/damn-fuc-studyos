import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { ThemePreference } from '@/types/database'

type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const storageKey = 'studyos-theme'

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): ThemePreference {
  try {
    const value = window.localStorage.getItem(storageKey)
    return isThemePreference(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function readSystemTheme(): ResolvedTheme {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeValue] = useState<ThemePreference>(readStoredTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  const setTheme = useCallback((value: ThemePreference) => {
    setThemeValue(value)
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light')
    media.addEventListener('change', updateSystemTheme)
    return () => media.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // Theme remains active for this session when storage is unavailable.
    }
  }, [resolvedTheme, theme])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [resolvedTheme, setTheme, theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
