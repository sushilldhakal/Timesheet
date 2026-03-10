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
