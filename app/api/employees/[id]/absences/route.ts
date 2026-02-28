import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { AbsenceManager } from "@/lib/managers/absence-manager"
import { LeaveType } from "@/lib/db/schemas/leave-record"

/**
 * GET /api/employees/[id]/absences?startDate=...&endDate=...
 * Get leave records for an employee
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
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    )
  }

  try {
    await connectDB()
    const absenceManager = new AbsenceManager()
    const absences = await absenceManager.getLeaveRecords(
      id,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json({ absences })
  } catch (err) {
    console.error("[api/employees/[id]/absences GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch leave records" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/[id]/absences
 * Create a new leave record
 */
export async function POST(
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
    const { startDate, endDate, leaveType, notes } = body

    if (!startDate || !endDate || !leaveType) {
      return NextResponse.json(
        { error: "startDate, endDate, and leaveType are required" },
        { status: 400 }
      )
    }

    await connectDB()
    const absenceManager = new AbsenceManager()
    const leaveRecord = await absenceManager.createLeaveRecord(
      id,
      new Date(startDate),
      new Date(endDate),
      leaveType as LeaveType,
      notes
    )

    return NextResponse.json({ leaveRecord }, { status: 201 })
  } catch (err) {
    console.error("[api/employees/[id]/absences POST]", err)
    return NextResponse.json(
      { error: "Failed to create leave record" },
      { status: 500 }
    )
  }
}
