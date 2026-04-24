"use client"

import * as React from "react"
import {
  setThemeCookie,
  getSystemTheme,
  applyTheme,
  THEME_STORAGE_KEY,
  type Theme,
  getThemeCookieClient,
} from "@/lib/utils/theme"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme)

  const setTheme = React.useCallback((next: Theme) => {
    setThemeCookie(next)
    applyTheme(next)
    setThemeState(next)
  }, [])

  // Apply theme on mount and when initialTheme changes (e.g. after navigation)
  React.useEffect(() => {
    const stored = getThemeCookieClient()
    const toApply = (stored === "light" || stored === "dark") ? stored : initialTheme
    applyTheme(toApply)
    setThemeState(toApply)
  }, [initialTheme])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export { THEME_STORAGE_KEY }
