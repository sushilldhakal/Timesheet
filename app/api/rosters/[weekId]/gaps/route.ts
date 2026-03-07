import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Roster } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { GapIdentifier } from "@/lib/managers/gap-identifier"

type RouteContext = { params: Promise<{ weekId: string }> }

/** GET /api/rosters/[weekId]/gaps?organizationId=...&includeSuggestions=true - Detect staffing gaps in a roster */
export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const weekId = (await context.params).weekId
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get("organizationId")
  const includeSuggestions = searchParams.get("includeSuggestions") === "true"

  // Validate weekId format
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    return NextResponse.json(
      { error: "Invalid week ID format (expected YYYY-Www)" },
      { status: 400 }
    )
  }

  try {
    await connectDB()

    // Use enhanced gap identifier if organizationId is provided
    if (organizationId && includeSuggestions) {
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return NextResponse.json(
          { error: "Roster not found" },
          { status: 404 }
        )
      }

      const gapIdentifier = new GapIdentifier()
      const gaps = await gapIdentifier.identifyGaps(
        roster._id.toString(),
        organizationId
      )

      return NextResponse.json({ gaps })
    }

    // Fall back to existing roster manager
    const rosterManager = new RosterManager()
    const result = await rosterManager.detectGaps(weekId)

    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ gaps: result.gaps })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/gaps GET]", err)
    return NextResponse.json(
      {
        error: "Failed to detect gaps",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    )
  }
}
