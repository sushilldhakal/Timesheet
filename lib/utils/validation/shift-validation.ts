import { connectDB } from "@/lib/db"
import { DailyShift } from "@/lib/db/schemas/daily-shift"

/**
 * Check if a shift overlaps with existing shifts for an employee
 */
export async function checkShiftOverlap(
  employeeId: string,
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string // for updates
): Promise<{ hasOverlap: boolean; conflictingShiftId?: string }> {
  try {
    await connectDB()
    
    // Match how `DailyShift.date` is stored (UTC start-of-day)
    const shiftDate = new Date(Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate(), 0, 0, 0, 0))
    
    // Build query to find overlapping shifts
    const query: any = {
      employeeId,
      date: shiftDate,
      clockOut: { $exists: true }, // Only check completed shifts
      $or: [
        // New shift starts during existing shift
        {
          'clockIn.time': { $lte: startTime },
          'clockOut.time': { $gt: startTime }
        },
        // New shift ends during existing shift
        {
          'clockIn.time': { $lt: endTime },
          'clockOut.time': { $gte: endTime }
        },
        // New shift completely contains existing shift
        {
          'clockIn.time': { $gte: startTime },
          'clockOut.time': { $lte: endTime }
        },
        // Existing shift completely contains new shift
        {
          'clockIn.time': { $lte: startTime },
          'clockOut.time': { $gte: endTime }
        }
      ]
    }
    
    // Exclude the current shift if updating
    if (excludeShiftId) {
      query._id = { $ne: excludeShiftId }
    }
    
    const conflictingShift = await DailyShift.findOne(query)
    
    return {
      hasOverlap: !!conflictingShift,
      conflictingShiftId: conflictingShift?._id?.toString()
    }
  } catch (error) {
    console.error('Error checking shift overlap:', error)
    return { hasOverlap: false }
  }
}