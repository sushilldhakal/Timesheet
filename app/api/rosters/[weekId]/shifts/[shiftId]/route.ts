import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { SchedulingValidator } from "@/lib/validations/scheduling-validator"
import mongoose from "mongoose"
import { z } from "zod"

type RouteContext = { params: Promise<{ weekId: string; shiftId: string }> }

// Validation schema for shift update (all fields optional)
const shiftUpdateSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  notes: z.string().optional(),
})

/** PUT /api/rosters/[weekId]/shifts/[shiftId] - Update a shift */
export async function PUT(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await context.params
  const weekId = params.weekId
  const shiftId = params.shiftId
  
  // Validate weekId format
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    return NextResponse.json(
      { error: "Invalid week ID format (expected YYYY-Www)" },
      { status: 400 }
    )
  }
  
  // Validate shiftId
  if (!mongoose.Types.ObjectId.isValid(shiftId)) {
    return NextResponse.json({ error: "Invalid shift ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = shiftUpdateSchema.safeParse(body)
    
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
    
    // Prepare update data (only include provided fields)
    const updateData: Record<string, unknown> = {}
    
    if (parsed.data.employeeId !== undefined) {
      updateData.employeeId = parsed.data.employeeId ? new mongoose.Types.ObjectId(parsed.data.employeeId) : null
    }
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date)
    }
    if (parsed.data.startTime) {
      updateData.startTime = new Date(parsed.data.startTime)
    }
    if (parsed.data.endTime) {
      updateData.endTime = new Date(parsed.data.endTime)
    }
    if (parsed.data.locationId) {
      updateData.locationId = new mongoose.Types.ObjectId(parsed.data.locationId)
    }
    if (parsed.data.roleId) {
      updateData.roleId = new mongoose.Types.ObjectId(parsed.data.roleId)
    }
    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes
    }
    
    // If role, location, employee, or date are being updated, validate the shift
    if (parsed.data.roleId || parsed.data.locationId || parsed.data.employeeId !== undefined || parsed.data.date) {
      // Get the current shift to merge with updates
      const currentRoster = await rosterManager.getRoster(weekId)
      if (!currentRoster.success || !currentRoster.roster) {
        return NextResponse.json(
          { error: "ROSTER_NOT_FOUND", message: "Roster not found" },
          { status: 404 }
        )
      }
      
      const currentShift = currentRoster.roster.shifts.find(
        (s) => s._id?.toString() === shiftId
      )
      
      if (!currentShift) {
        return NextResponse.json(
          { error: "SHIFT_NOT_FOUND", message: "Shift not found" },
          { status: 404 }
        )
      }
      
      // Merge current shift data with updates for validation
      const employeeIdToValidate = parsed.data.employeeId !== undefined 
        ? (parsed.data.employeeId ? new mongoose.Types.ObjectId(parsed.data.employeeId) : null)
        : currentShift.employeeId
      const roleIdToValidate = parsed.data.roleId 
        ? new mongoose.Types.ObjectId(parsed.data.roleId)
        : currentShift.roleId
      const locationIdToValidate = parsed.data.locationId 
        ? new mongoose.Types.ObjectId(parsed.data.locationId)
        : currentShift.locationId
      const dateToValidate = parsed.data.date 
        ? new Date(parsed.data.date)
        : currentShift.date
      
      // Validate the updated shift
      const validator = new SchedulingValidator()
      const validationResult = await validator.validateShift(
        employeeIdToValidate,
        roleIdToValidate,
        locationIdToValidate,
        dateToValidate
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
    }
    
    const result = await rosterManager.updateShift(weekId, shiftId, updateData)
    
    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 404 }
        )
      }
      if (result.error === "SHIFT_NOT_FOUND") {
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
    
    return NextResponse.json({ shift: result.shift })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/shifts/[shiftId] PUT]", err)
    return NextResponse.json(
      { 
        error: "Failed to update shift", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}

/** DELETE /api/rosters/[weekId]/shifts/[shiftId] - Delete a shift */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await context.params
  const weekId = params.weekId
  const shiftId = params.shiftId
  
  // Validate weekId format
  if (!/^\d{4}-W\d{2}$/.test(weekId)) {
    return NextResponse.json(
      { error: "Invalid week ID format (expected YYYY-Www)" },
      { status: 400 }
    )
  }
  
  // Validate shiftId
  if (!mongoose.Types.ObjectId.isValid(shiftId)) {
    return NextResponse.json({ error: "Invalid shift ID" }, { status: 400 })
  }

  try {
    await connectDB()
    
    const rosterManager = new RosterManager()
    const result = await rosterManager.deleteShift(weekId, shiftId)
    
    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 404 }
        )
      }
      if (result.error === "SHIFT_NOT_FOUND") {
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
    
    return NextResponse.json({ message: "Shift deleted successfully" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/rosters/[weekId]/shifts/[shiftId] DELETE]", err)
    return NextResponse.json(
      { 
        error: "Failed to delete shift", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
