import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"

type RouteContext = { params: Promise<{ weekId: string }> }

/** PUT /api/rosters/[weekId]/publish - Publish a roster */
export async function PUT(request: NextRequest, context: RouteContext) {
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
    await connectDB()
    
    const rosterManager = new RosterManager()
    const result = await rosterManager.publishRoster(weekId)
    
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
    
    return NextResponse.json({ 
      message: "Roster published successfully",
      roster: result.roster 
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/publish PUT]", err)
    return NextResponse.json(
      { 
        error: "Failed to publish roster", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
