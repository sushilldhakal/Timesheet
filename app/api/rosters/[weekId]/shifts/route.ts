import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { SchedulingValidator } from "@/lib/validations/scheduling-validator"
import mongoose from "mongoose"
import { z } from "zod"

type RouteContext = { params: Promise<{ weekId: string }> }

// Validation schema for shift creation
const shiftCreateSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  notes: z.string().optional().default(""),
})

/** POST /api/rosters/[weekId]/shifts - Add a shift to a roster */
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
    const parsed = shiftCreateSchema.safeParse(body)
    
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
    
    // Validate shift using SchedulingValidator
    const validator = new SchedulingValidator()
    const validationResult = await validator.validateShift(
      parsed.data.employeeId ? new mongoose.Types.ObjectId(parsed.data.employeeId) : null,
      new mongoose.Types.ObjectId(parsed.data.roleId),
      new mongoose.Types.ObjectId(parsed.data.locationId),
      new Date(parsed.data.date)
    )
    
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          message: validationResult.message || validationResult.error,
          details: validationResult.error,
        },
        { status: 400 }
      )
    }
    
    const rosterManager = new RosterManager()
    
    // Prepare shift data
    const shiftData = {
      employeeId: parsed.data.employeeId ? new mongoose.Types.ObjectId(parsed.data.employeeId) : null,
      date: new Date(parsed.data.date),
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      locationId: new mongoose.Types.ObjectId(parsed.data.locationId),
      roleId: new mongoose.Types.ObjectId(parsed.data.roleId),
      sourceScheduleId: null, // Manual shift
      notes: parsed.data.notes,
    }
    
    const result = await rosterManager.addShift(weekId, shiftData)
    
    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ shift: result.shift }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/shifts POST]", err)
    return NextResponse.json(
      { 
        error: "Failed to add shift", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
