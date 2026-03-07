import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { AvailabilityConstraint } from "@/lib/db/schemas/availability-constraint"
import mongoose from "mongoose"

/**
 * GET /api/employees/[id]/availability?organizationId=...
 * Get availability constraints for an employee
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
  const organizationId = searchParams.get("organizationId")

  try {
    await connectDB()

    const query: any = { employeeId: new mongoose.Types.ObjectId(id) }
    if (organizationId) {
      query.organizationId = organizationId
    }

    const constraints = await AvailabilityConstraint.find(query)

    return NextResponse.json({ constraints })
  } catch (err) {
    console.error("[api/employees/[id]/availability GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch availability constraints" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/[id]/availability
 * Create or update availability constraints
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
    const {
      organizationId,
      unavailableDays,
      unavailableTimeRanges,
      preferredShiftTypes,
      maxConsecutiveDays,
      minRestHours,
      temporaryStartDate,
      temporaryEndDate,
      reason,
    } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const constraint = await AvailabilityConstraint.create({
      employeeId: new mongoose.Types.ObjectId(id),
      organizationId,
      unavailableDays: unavailableDays || [],
      unavailableTimeRanges: unavailableTimeRanges || [],
      preferredShiftTypes: preferredShiftTypes || [],
      maxConsecutiveDays: maxConsecutiveDays || null,
      minRestHours: minRestHours || null,
      temporaryStartDate: temporaryStartDate ? new Date(temporaryStartDate) : null,
      temporaryEndDate: temporaryEndDate ? new Date(temporaryEndDate) : null,
      reason: reason || "",
    })

    return NextResponse.json({ constraint }, { status: 201 })
  } catch (err) {
    console.error("[api/employees/[id]/availability POST]", err)
    return NextResponse.json(
      { error: "Failed to create availability constraint" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/employees/[id]/availability?constraintId=...
 * Delete an availability constraint
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await context.params // Just await to satisfy type, id not used in this handler
  const { searchParams } = new URL(request.url)
  const constraintId = searchParams.get("constraintId")

  if (!constraintId) {
    return NextResponse.json(
      { error: "constraintId is required" },
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const result = await AvailabilityConstraint.findByIdAndDelete(constraintId)

    if (!result) {
      return NextResponse.json(
        { error: "Constraint not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/employees/[id]/availability DELETE]", err)
    return NextResponse.json(
      { error: "Failed to delete availability constraint" },
      { status: 500 }
    )
  }
}
