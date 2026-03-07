import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"
import mongoose from "mongoose"

type RouteContext = { params: Promise<{ shiftId: string }> }

/** GET /api/analytics/variance/[shiftId] - Calculate variance for a specific shift */
export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const shiftId = (await context.params).shiftId
  
  // Validate shiftId format
  if (!mongoose.Types.ObjectId.isValid(shiftId)) {
    return NextResponse.json(
      { error: "Invalid shift ID format" },
      { status: 400 }
    )
  }

  try {
    await connectDB()
    
    const analyticsService = new VarianceAnalyticsService()
    const result = await analyticsService.calculateVariance(shiftId)
    
    if (!result.success) {
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
    
    return NextResponse.json({
      scheduledHours: result.scheduledHours,
      actualHours: result.actualHours,
      variance: result.variance,
      timesheetCount: result.timesheetCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/analytics/variance/[shiftId] GET]", err)
    return NextResponse.json(
      { 
        error: "Failed to calculate variance", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
