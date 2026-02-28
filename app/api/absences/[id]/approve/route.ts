import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { AbsenceManager } from "@/lib/managers/absence-manager"

/**
 * PATCH /api/absences/[id]/approve
 * Approve a leave record
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const { approverId } = body

    if (!approverId) {
      return NextResponse.json(
        { error: "approverId is required" },
        { status: 400 }
      )
    }

    await connectDB()
    const absenceManager = new AbsenceManager()
    const leaveRecord = await absenceManager.approveLeaveRecord(id, approverId)

    // Get affected shifts
    const affectedShifts = await absenceManager.identifyReplacementNeeds(id)

    return NextResponse.json({
      leaveRecord,
      affectedShifts: affectedShifts.map((shift) => ({
        shiftId: shift._id.toString(),
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })),
    })
  } catch (err: any) {
    console.error("[api/absences/[id]/approve PATCH]", err)

    if (err.message?.includes("not found")) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to approve leave record" },
      { status: 500 }
    )
  }
}
