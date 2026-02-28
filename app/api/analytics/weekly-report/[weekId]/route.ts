import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"

type RouteContext = { params: Promise<{ weekId: string }> }

/** GET /api/analytics/weekly-report/[weekId] - Generate weekly report for a specific week */
export async function GET(request: NextRequest, context: RouteContext) {
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
    
    const analyticsService = new VarianceAnalyticsService()
    const result = await analyticsService.generateWeeklyReport(weekId)
    
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
    
    return NextResponse.json({ report: result.report })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[api/analytics/weekly-report/[weekId] GET]", err)
    return NextResponse.json(
      { 
        error: "Failed to generate weekly report", 
        details: process.env.NODE_ENV === "development" ? message : undefined 
      },
      { status: 500 }
    )
  }
}
