import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"
import mongoose from "mongoose"

type RouteContext = { params: Promise<{ employeeId: string }> }

/** GET /api/analytics/employee-report/[employeeId] - Generate employee report for a date range */
export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const employeeId = (await context.params).employeeId
  
  // Validate employeeId format
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      { error: "Invalid employee ID format" },
      { status: 400 }
    )
  }

  // Get query parameters for date range
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  // Validate required query parameters
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required query parameters: startDate and endDate (YYYY-MM-DD format)" },
      { status: 400 }
    )
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD" },
      { status: 400 }
    )
  }

  // Validate date range
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "Invalid date values" },
      { status: 400 }
    )
  }
  if (start > end) {
    return NextResponse.json(
      { error: "startDate must be before or equal to endDate" },
      { status: 400 }
    )
  }

  try {
    await connectDB()
    
    const analyticsService = new VarianceAnalyticsService()
    const result = await analyticsService.generateEmployeeReport(employeeId, startDate, endDate)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ report: result.report })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/analytics/employee-report/[employeeId] GET]", err)
    return NextResponse.json(
      { 
        error: "Failed to generate employee report", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
