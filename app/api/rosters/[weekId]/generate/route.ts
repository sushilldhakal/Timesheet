import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { z } from "zod"

type RouteContext = { params: Promise<{ weekId: string }> }

// Validation schema for roster generation
const generateSchema = z.object({
  mode: z.enum(["copy", "schedules"]),
  copyFromWeekId: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  includeEmploymentTypes: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
})

/** POST /api/rosters/[weekId]/generate - Generate roster from schedules or copy from another week */
export async function POST(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const weekId = (await context.params).weekId

  // Validate weekId format
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    return NextResponse.json(
      { error: "Invalid week ID format (expected YYYY-Www)" },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    await connectDB()

    const rosterManager = new RosterManager()

    // Check if roster exists, create if not
    const existingRoster = await rosterManager.getRoster(weekId)
    if (!existingRoster.success) {
      const createResult = await rosterManager.createRoster(weekId)
      if (!createResult.success) {
        return NextResponse.json(
          { error: createResult.error, message: createResult.message },
          { status: 400 }
        )
      }
    }

    // Generate based on mode
    if (parsed.data.mode === "copy") {
      if (!parsed.data.copyFromWeekId) {
        return NextResponse.json(
          { error: "copyFromWeekId is required when mode is 'copy'" },
          { status: 400 }
        )
      }

      const result = await rosterManager.copyRosterFromWeek(weekId, parsed.data.copyFromWeekId)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          message: "Roster copied successfully",
          shiftsCreated: result.shiftsCreated,
        },
        { status: 200 }
      )
    } else {
      // Mode: schedules
      const result = await rosterManager.populateRosterFromSchedules(
        weekId,
        parsed.data.includeEmploymentTypes,
        parsed.data.locationIds
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          message: "Roster generated from schedules",
          shiftsCreated: result.shiftsCreated,
        },
        { status: 200 }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/generate POST]", err)
    return NextResponse.json(
      {
        error: "Failed to generate roster",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    )
  }
}
