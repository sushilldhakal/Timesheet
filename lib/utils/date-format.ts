/**
 * Date formatting utilities
 * Reads DATE_FORMAT from environment and provides consistent date formatting
 */

import { format, parse } from "date-fns"
import { enUS } from "date-fns/locale"

// Get date format from environment, default to dd-MM-yyyy
const DATE_FORMAT = process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || "dd-MM-yyyy"

/**
 * Format a Date object to the configured date format string
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "27-02-2026" for dd-MM-yyyy)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  
  return format(d, DATE_FORMAT)
}

/**
 * Format a Date object to a long readable format
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "Fri 27th February 2026")
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return ""
  
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  
  // Format: "Fri 27th February 2026"
  const dayName = format(d, "EEE", { locale: enUS })
  const day = d.getDate()
  const month = format(d, "MMM", { locale: enUS })
  const year = d.getFullYear()
  
  // Add ordinal suffix (st, nd, rd, th)
  const ordinal = getOrdinalSuffix(day)
  
  return `${dayName} ${day}${ordinal} ${month} ${year}`
}

/**
 * Parse a date string in the configured format to a Date object
 * @param dateStr - Date string to parse
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  try {
    const parsed = parse(dateStr, DATE_FORMAT, new Date())
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

/**
 * Convert a Date to start of day (00:00:00.000)
 * @param date - Date object
 * @returns Date at start of day
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Convert a Date to end of day (23:59:59.999)
 * @param date - Date object
 * @returns Date at end of day
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Get ordinal suffix for a day number
 * @param day - Day number (1-31)
 * @returns Ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th"
  switch (day % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

/**
 * Get the current date format pattern
 * @returns Date format pattern (e.g., "dd-MM-yyyy")
 */
export function getDateFormat(): string {
  return DATE_FORMAT
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) for API/database
 * @param date - Date object to format
 * @returns ISO date string
 */
export function toISODate(date: Date | string | null | undefined): string {
  if (!date) return ""
  
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  
  return format(d, "yyyy-MM-dd")
}

/**
 * Parse ISO date string (YYYY-MM-DD) to Date object
 * @param isoDate - ISO date string
 * @returns Date object or null if invalid
 */
export function fromISODate(isoDate: string): Date | null {
  if (!isoDate) return null
  
  try {
    const parsed = parse(isoDate, "yyyy-MM-dd", new Date())
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}
