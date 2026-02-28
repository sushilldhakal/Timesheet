import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { z } from "zod"

// Validation schema for roster creation
const rosterCreateSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)"),
  autoPopulate: z.boolean().optional().default(true),
})

/** POST /api/rosters - Create a new roster for a specific week */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = rosterCreateSchema.safeParse(body)
    
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
    
    // Create roster
    const createResult = await rosterManager.createRoster(parsed.data.weekId)
    
    if (!createResult.success) {
      return NextResponse.json(
        { error: createResult.error, message: createResult.message },
        { status: 400 }
      )
    }
    
    // Auto-populate if requested
    if (parsed.data.autoPopulate) {
      const populateResult = await rosterManager.populateRosterFromSchedules(parsed.data.weekId)
      
      if (!populateResult.success) {
        return NextResponse.json(
          { 
            error: populateResult.error, 
            message: populateResult.message,
            roster: createResult.roster // Return roster even if population failed
          },
          { status: 207 } // Multi-status: roster created but population failed
        )
      }
      
      return NextResponse.json(
        { 
          roster: createResult.roster,
          shiftsGenerated: populateResult.shiftsCreated 
        },
        { status: 201 }
      )
    }
    
    return NextResponse.json({ roster: createResult.roster }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters POST]", err)
    return NextResponse.json(
      { 
        error: "Failed to create roster", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
