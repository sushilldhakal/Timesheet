/**
 * Parse time string or Date to minutes since midnight.
 */
export function parseTimeToMinutes(t?: string | Date): number {
  if (!t) return 0

  // Handle Date objects
  if (t instanceof Date) {
    if (isNaN(t.getTime())) return 0
    return t.getHours() * 60 + t.getMinutes()
  }

  // Handle strings
  if (typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()

  // ISO format
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes()
    }
  } catch {}

  // HH:mm format
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    return h * 60 + m
  }

  return 0
}

/** Format minutes to "Xh Ym" */
export function minutesToHours(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return "—"
  if (min < 0) return "0h"
  if (min === 0) return "0h"
  const h = Math.floor(min / 60)
  const remainder = Math.round(min % 60)
  if (remainder === 0) return `${h}h`
  return `${h}h ${remainder}m`
}

/**
 * Convert Date object or string to HH:mm format string.
 */
export function formatTimeString(t?: Date | string): string {
  if (!t) return ""
  if (t instanceof Date) {
    const hours = t.getHours().toString().padStart(2, "0")
    const minutes = t.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }
  return String(t)
}

/**
 * Convert HH:mm string to Date object (today's date with that time).
 */
export function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Format time string to 12-hour format with AM/PM
 */
export function formatTime(t?: string): string {
  if (!t || typeof t !== "string" || !t.trim()) return "—"
  const s = t.trim()
  if (s === "—") return "—"
  
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (h === 0 && m === 0) return "—"
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
  }
  
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
  }
  
  return s || "—"
}

/**
 * Format minutes to display format (e.g., "1h 30m", "45m")
 */
export function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—"
  if (min === 0) return "0m"
  
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Parse time string or Date to 24h hour (0–23)
 */
export function parseTimeToHour24(t?: string | Date): number | null {
  if (!t) return null
  
  if (t instanceof Date) {
    if (isNaN(t.getTime())) return null
    return t.getHours()
  }
  
  if (typeof t !== "string" || !t.trim()) return null
  const s = t.trim()
  
  // Try parsing as time string
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    return h >= 0 && h <= 23 ? h : null
  }
  
  // Try parsing as Date
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      return d.getHours()
    }
  } catch {}
  
  return null
}

/**
 * Format a Date object to HH:MM string using ISO format to avoid timezone issues
 */
export function formatTimeFromDate(date: Date): string {
  // Use ISO string and extract time part to avoid server timezone issues
  const isoString = date.toISOString() // Always UTC
  const timePart = isoString.split('T')[1] // Get time part
  const [hours, minutes] = timePart.split(':')
  return `${hours}:${minutes}`
}

/**
 * Format minutes since midnight to 12-hour time format (e.g., "8:30 AM")
 */
export function formatMinutesToTime(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—"
  
  const h = Math.floor(min / 60) % 24
  const m = Math.floor(min % 60)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}
