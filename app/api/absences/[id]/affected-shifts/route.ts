import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { AbsenceManager } from "@/lib/managers/absence-manager"

/**
 * GET /api/absences/[id]/affected-shifts
 * Get shifts affected by a leave record
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    await connectDB()
    const absenceManager = new AbsenceManager()
    const affectedShifts = await absenceManager.identifyReplacementNeeds(id)

    return NextResponse.json({
      affectedShifts: affectedShifts.map((shift) => ({
        shiftId: shift._id.toString(),
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        locationId: shift.locationId.toString(),
        roleId: shift.roleId.toString(),
      })),
    })
  } catch (err: any) {
    console.error("[api/absences/[id]/affected-shifts GET]", err)

    if (err.message?.includes("not found")) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch affected shifts" },
      { status: 500 }
    )
  }
}
