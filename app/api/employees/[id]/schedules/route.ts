import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { ScheduleManager } from "@/lib/managers/schedule-manager"
import mongoose from "mongoose"
import { z } from "zod"

type RouteContext = { params: Promise<{ id: string }> }

// Validation schema for schedule creation/update
const scheduleSchema = z.object({
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

const scheduleUpdateSchema = scheduleSchema.partial()

/** GET /api/employees/[id]/schedules - Get schedules for an employee with optional date filtering */
export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  
  // Validate employee ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    await connectDB()
    
    // Check if employee exists and user has access
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) {
      empFilter.$and = [locFilter]
    }
    
    const employee = await Employee.findOne(empFilter).lean()
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check for date filtering
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get("date")
    
    if (dateParam) {
      // Get active schedules for specific date
      const date = new Date(dateParam)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      
      const scheduleManager = new ScheduleManager()
      const result = await scheduleManager.getActiveSchedules(id, date)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ schedules: result.schedules })
    } else {
      // Return all schedules
      return NextResponse.json({ schedules: employee.schedules || [] })
    }
  } catch (err) {
    console.error("[api/employees/[id]/schedules GET]", err)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}

/** POST /api/employees/[id]/schedules - Create a new schedule for an employee */
export async function POST(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  
  // Validate employee ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = scheduleSchema.safeParse(body)
    
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

    // Create schedule using ScheduleManager
    const scheduleManager = new ScheduleManager()
    const scheduleData = {
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      locationId: new mongoose.Types.ObjectId(parsed.data.locationId),
      roleId: new mongoose.Types.ObjectId(parsed.data.roleId),
      effectiveFrom: new Date(parsed.data.effectiveFrom),
      effectiveTo: parsed.data.effectiveTo ? new Date(parsed.data.effectiveTo) : null,
    }
    
    const result = await scheduleManager.createSchedule(id, scheduleData)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ schedule: result.schedule }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/employees/[id]/schedules POST]", err)
    return NextResponse.json(
      { 
        error: "Failed to create schedule", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
