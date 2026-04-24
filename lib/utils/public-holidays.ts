import { PublicHoliday } from "@/lib/db/schemas/public-holiday"
import { connectDB } from "@/lib/db"

export async function checkPublicHoliday(date: Date, state?: string): Promise<boolean> {
  await connectDB()
  // Extract year/month/day from the ISO string so normalization is always on the
  // intended calendar date, regardless of the server's local timezone.
  const iso = date.toISOString() // always UTC, e.g. "2026-12-25T12:00:00.000Z"
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const normalizedDate = new Date(Date.UTC(y, m - 1, d))
  const states = state ? [state, 'NAT'] : ['NAT']
  const holiday = await PublicHoliday.findOne({ date: normalizedDate, state: { $in: states } })
  return !!holiday
}

/**
 * Get all public holidays for a given year
 * Useful for calendar displays and bulk processing
 */
export async function getPublicHolidaysForYear(year: number, state?: string): Promise<Array<{ date: Date; name: string }>> {
  await connectDB()

  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31)

  const states = state ? [state, 'NAT'] : ['NAT']

  const holidays = await PublicHoliday.find({
    date: { $gte: startOfYear, $lte: endOfYear },
    state: { $in: states },
  }).sort({ date: 1 })

  return holidays.map((holiday) => ({
    date: holiday.date,
    name: holiday.name,
  }))
}

/**
 * Check if a date range contains any public holidays
 * Useful for payroll processing and shift planning
 */
export async function hasPublicHolidayInRange(startDate: Date, endDate: Date, state?: string): Promise<boolean> {
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (await checkPublicHoliday(current, state)) {
      return true
    }
    current.setDate(current.getDate() + 1)
  }
  
  return false
}