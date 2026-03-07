import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { ScheduleManager } from "@/lib/managers/schedule-manager"
import mongoose from "mongoose"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> }

// Validation schema for schedule update (all fields optional)
const scheduleUpdateSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

/** PUT /api/employees/[id]/schedules/[scheduleId] - Update a schedule */
export async function PUT(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await context.params
  const { id, scheduleId } = params
  
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }
  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = scheduleUpdateSchema.safeParse(body)
    
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
    
    // Check if employee exists and user has access
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) {
      empFilter.$and = [locFilter]
    }
    
    const employee = await Employee.findOne(empFilter)
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (parsed.data.dayOfWeek !== undefined) {
      updateData.dayOfWeek = parsed.data.dayOfWeek
    }
    if (parsed.data.startTime !== undefined) {
      updateData.startTime = new Date(parsed.data.startTime)
    }
    if (parsed.data.endTime !== undefined) {
      updateData.endTime = new Date(parsed.data.endTime)
    }
    if (parsed.data.locationId !== undefined) {
      updateData.locationId = new mongoose.Types.ObjectId(parsed.data.locationId)
    }
    if (parsed.data.roleId !== undefined) {
      updateData.roleId = new mongoose.Types.ObjectId(parsed.data.roleId)
    }
    if (parsed.data.effectiveFrom !== undefined) {
      updateData.effectiveFrom = new Date(parsed.data.effectiveFrom)
    }
    if (parsed.data.effectiveTo !== undefined) {
      updateData.effectiveTo = parsed.data.effectiveTo ? new Date(parsed.data.effectiveTo) : null
    }

    // Update schedule using ScheduleManager
    const scheduleManager = new ScheduleManager()
    const result = await scheduleManager.updateSchedule(id, scheduleId, updateData)
    
    if (!result.success) {
      const statusCode = result.error === "SCHEDULE_NOT_FOUND" ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: statusCode }
      )
    }
    
    return NextResponse.json({ schedule: result.schedule })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/employees/[id]/schedules/[scheduleId] PUT]", err)
    return NextResponse.json(
      { 
        error: "Failed to update schedule", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}

/** DELETE /api/employees/[id]/schedules/[scheduleId] - Delete a schedule */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await context.params
  const { id, scheduleId } = params
  
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }
  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 })
  }

  try {
    await connectDB()
    
    // Check if employee exists and user has access
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) {
      empFilter.$and = [locFilter]
    }
    
    const employee = await Employee.findOne(empFilter)
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Delete schedule using ScheduleManager
    const scheduleManager = new ScheduleManager()
    const result = await scheduleManager.deleteSchedule(id, scheduleId)
    
    if (!result.success) {
      const statusCode = result.error === "SCHEDULE_NOT_FOUND" ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: statusCode }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/employees/[id]/schedules/[scheduleId] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}
