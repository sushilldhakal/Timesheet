import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"
import mongoose from "mongoose"

/**
 * GET /api/timesheets/by-shift/:shiftId
 * Get all timesheets linked to a specific roster shift
 * Supports multiple timesheets per shift (e.g., split shifts, breaks)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { shiftId } = await params
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
      return NextResponse.json(
        { error: "Invalid shift ID format" },
        { status: 400 }
      )
    }

    await connectDB()

    const manager = new TimesheetManager()
    const result = await manager.getTimesheetsForShift(shiftId)

    if (!result.success) {
      const statusCode = result.error === "SHIFT_NOT_FOUND" ? 404 : 500
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      timesheets: result.timesheets,
      count: result.timesheets?.length ?? 0,
    })
  } catch (err) {
    console.error("[api/timesheets/by-shift/:shiftId GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheets for shift" },
      { status: 500 }
    )
  }
}
