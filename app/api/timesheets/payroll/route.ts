import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"

/**
 * GET /api/timesheets/payroll
 * Get timesheets for payroll processing within a date range
 * 
 * Query parameters:
 * - startDate: Start date in YYYY-MM-DD format (required)
 * - endDate: End date in YYYY-MM-DD format (required)
 * - pin: Optional employee pin filter
 * - type: Optional type filter (in, out, break, endBreak)
 * - sortBy: Sort field (date, pin, time) - default: date
 * - sortOrder: Sort order (asc, desc) - default: asc
 * - format: Response format (list, pairs) - default: list
 */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const pin = searchParams.get("pin") || undefined
    const type = searchParams.get("type") || undefined
    const sortBy = (searchParams.get("sortBy") as "date" | "pin" | "time") || "date"
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc"
    const format = searchParams.get("format") || "list"

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required (YYYY-MM-DD format)" },
        { status: 400 }
      )
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
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

    // Validate sortBy
    if (!["date", "pin", "time"].includes(sortBy)) {
      return NextResponse.json(
        { error: "sortBy must be one of: date, pin, time" },
        { status: 400 }
      )
    }

    // Validate sortOrder
    if (!["asc", "desc"].includes(sortOrder)) {
      return NextResponse.json(
        { error: "sortOrder must be one of: asc, desc" },
        { status: 400 }
      )
    }

    await connectDB()

    const manager = new TimesheetManager()

    // Handle different response formats
    if (format === "pairs") {
      // Return clock-in/clock-out pairs for payroll
      const result = await manager.getTimesheetPairsForPayroll(startDate, endDate)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        format: "pairs",
        startDate,
        endDate,
        pairs: result.pairs,
        count: result.pairs?.length ?? 0,
      })
    } else {
      // Return list of timesheets
      const result = await manager.getTimesheetsForDateRange(startDate, endDate, {
        pin,
        type,
        sortBy,
        sortOrder,
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        format: "list",
        startDate,
        endDate,
        filters: {
          pin: pin || null,
          type: type || null,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
        timesheets: result.timesheets,
        count: result.timesheets?.length ?? 0,
      })
    }
  } catch (err) {
    console.error("[api/timesheets/payroll GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheets for payroll" },
      { status: 500 }
    )
  }
}
