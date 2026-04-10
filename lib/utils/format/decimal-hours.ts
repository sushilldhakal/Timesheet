/**
 * Convert a decimal hour value (e.g. 1.5) to "HH:mm" string (e.g. "01:30")
 */
export function decimalHoursToHHMM(decimal: number): string {
  const h = Math.floor(decimal)
  const m = Math.round((decimal % 1) * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Convert "HH:mm" string to decimal hours (e.g. "01:30" → 1.5)
 */
export function hhmmToDecimalHours(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h + m / 60
}

/**
 * Set hours and minutes on a Date object from a decimal hour value.
 * E.g., setTimeFromDecimalHours(date, 14.5) sets time to 14:30:00.000
 */
export function setTimeFromDecimalHours(date: Date, decimalHour: number): void {
  const hours = Math.floor(decimalHour)
  const minutes = Math.round((decimalHour % 1) * 60)
  date.setHours(hours, minutes, 0, 0)
}
