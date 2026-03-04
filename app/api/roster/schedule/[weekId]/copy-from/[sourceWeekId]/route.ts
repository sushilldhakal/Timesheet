import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Roster } from "@/lib/db/schemas/roster"
import { verifyAuth } from "@/lib/auth-api"
import { addDays } from "date-fns"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string; sourceWeekId: string }> }
) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { weekId, sourceWeekId } = await params

    // Get source roster
    const sourceRoster = await Roster.findOne({ weekId: sourceWeekId })
    if (!sourceRoster) {
      return NextResponse.json(
        { error: "Source roster not found" },
        { status: 404 }
      )
    }

    // Get target roster (must be draft)
    let targetRoster = await Roster.findOne({ weekId })
    if (!targetRoster) {
      return NextResponse.json(
        { error: "Target roster not found" },
        { status: 404 }
      )
    }

    if (targetRoster.status !== "draft") {
      return NextResponse.json(
        { error: "Target roster must be in draft status" },
        { status: 400 }
      )
    }

    // Calculate the difference in days between source and target week starts
    const sourceDateObj = new Date(sourceRoster.weekStartDate)
    const targetDateObj = new Date(targetRoster.weekStartDate)
    const dayDifference = Math.floor(
      (targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Copy shifts and adjust dates
    const copiedShifts = sourceRoster.shifts.map((shift: any) => {
      const originalDate = new Date(shift.date)
      const newDate = addDays(originalDate, dayDifference)

      // Keep employee assignment but clear validation state
      return {
        employeeId: shift.employeeId,
        date: newDate,
        startTime: shift.startTime, // Keep original times
        endTime: shift.endTime,
        locationId: shift.locationId,
        roleId: shift.roleId,
        requiredStaffCount: shift.requiredStaffCount || 1,
        currentStaffCount: shift.employeeId ? 1 : 0,
        isUnderstaffed: !shift.employeeId,
        notes: shift.notes || "",
      }
    })

    // Update target roster
    targetRoster.shifts = copiedShifts
    targetRoster.updatedAt = new Date()
    await targetRoster.save()

    return NextResponse.json({
      message: "Roster copied successfully",
      roster: {
        _id: targetRoster._id,
        weekId: targetRoster.weekId,
        status: targetRoster.status,
        shifts: targetRoster.shifts,
        weekStartDate: targetRoster.weekStartDate,
        weekEndDate: targetRoster.weekEndDate,
      },
    })
  } catch (error) {
    console.error("POST /api/roster/copy-from error:", error)
    return NextResponse.json(
      { error: "Failed to copy roster" },
      { status: 500 }
    )
  }
}
