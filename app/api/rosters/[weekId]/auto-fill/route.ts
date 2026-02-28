import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { AutoFillEngine, EmploymentType } from "@/lib/managers/auto-fill-engine"

/**
 * POST /api/rosters/[weekId]/auto-fill
 * Auto-fill roster with shifts based on employee schedules
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ weekId: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { weekId } = await context.params

  try {
    const body = await request.json()
    const { organizationId, employmentTypes, validateAvailability, validateCompliance } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      )
    }

    // Default to FULL_TIME and PART_TIME if not specified
    const types: EmploymentType[] = employmentTypes || ["FULL_TIME", "PART_TIME"]

    await connectDB()

    // Find or create the roster
    const { Roster } = await import("@/lib/db")
    let roster = await Roster.findOne({ weekId })

    if (!roster) {
      // Create a new roster for this week
      const { getWeekBoundaries } = await import("@/lib/db/schemas/roster")
      const { start, end } = getWeekBoundaries(weekId)
      const [yearStr, weekStr] = weekId.split("-W")

      roster = await Roster.create({
        weekId: weekId,
        year: parseInt(yearStr, 10),
        weekNumber: parseInt(weekStr, 10),
        weekStartDate: start,
        weekEndDate: end,
        shifts: [],
        status: "draft",
      })
    }

    const autoFillEngine = new AutoFillEngine()
    const result = await autoFillEngine.fillRoster(
      roster._id.toString(),
      organizationId,
      types
    )

    return NextResponse.json({
      successCount: result.successCount,
      failureCount: result.failureCount,
      skippedCount: result.skippedCount,
      violations: result.violations,
    })
  } catch (err) {
    console.error("[api/rosters/[weekId]/auto-fill POST]", err)
    return NextResponse.json(
      { error: "Failed to auto-fill roster" },
      { status: 500 }
    )
  }
}
