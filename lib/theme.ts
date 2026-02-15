export const THEME_STORAGE_KEY = "theme"
export type Theme = "light" | "dark"

export function getThemeCookieClient(): Theme | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_STORAGE_KEY}=([^;]*)`))
  const value = match?.[1]
  if (value === "light" || value === "dark") return value
  return undefined
}

export function setThemeCookie(theme: Theme, days = 365) {
  if (typeof document === "undefined") return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; expires=${expires.toUTCString()}`
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
