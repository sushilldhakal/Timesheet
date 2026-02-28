export const THEME_STORAGE_KEY = "theme"
export type Theme = "light" | "dark"

export function getThemeCookieClient(): Theme | undefined {
  if (typeof document === "undefined") return undefined
  
  // Try cookie first
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_STORAGE_KEY}=([^;]*)`))
  const value = match?.[1]
  if (value === "light" || value === "dark") return value
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch (e) {
    // localStorage might not be available
  }
  
  return undefined
}

export function setThemeCookie(theme: Theme, days = 365) {
  if (typeof document === "undefined") return
  
  // Set cookie
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; expires=${expires.toUTCString()}`
  
  // Also set localStorage
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (e) {
    // localStorage might not be available
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
}
