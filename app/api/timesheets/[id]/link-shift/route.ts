import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"
import mongoose from "mongoose"

/**
 * PUT /api/timesheets/:id/link-shift
 * Manually link a timesheet to a roster shift
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { shiftId } = body

    if (!shiftId) {
      return NextResponse.json(
        { error: "shiftId is required" },
        { status: 400 }
      )
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid timesheet ID format" },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
      return NextResponse.json(
        { error: "Invalid shift ID format" },
        { status: 400 }
      )
    }

    await connectDB()

    const manager = new TimesheetManager()
    const result = await manager.linkTimesheetToShift(id, shiftId)

    if (!result.success) {
      const statusCode = result.error === "TIMESHEET_NOT_FOUND" ? 404 :
                         result.error === "INVALID_SHIFT_REF" ? 400 : 500
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      timesheet: result.timesheet,
    })
  } catch (err) {
    console.error("[api/timesheets/:id/link-shift PUT]", err)
    return NextResponse.json(
      { error: "Failed to link timesheet to shift" },
      { status: 500 }
    )
  }
}
