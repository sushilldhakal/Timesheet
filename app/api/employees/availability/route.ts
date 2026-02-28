import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { formatSuccess, formatError } from "@/lib/utils/api-response"
import mongoose from "mongoose"

/**
 * GET /api/employees/availability
 * Get available employees for a role at a location on a specific date
 * 
 * Query Parameters:
 * - roleId: string (required) - The role ID
 * - locationId: string (required) - The location ID
 * - date: string (optional) - ISO date string (default: today)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json(
      formatError("Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get("roleId")
  const locationId = searchParams.get("locationId")
  const dateParam = searchParams.get("date")

  // Validate required parameters
  if (!roleId) {
    return NextResponse.json(
      formatError("Role ID is required", "MISSING_ROLE_ID"),
      { status: 400 }
    )
  }

  if (!locationId) {
    return NextResponse.json(
      formatError("Location ID is required", "MISSING_LOCATION_ID"),
      { status: 400 }
    )
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    return NextResponse.json(
      formatError("Invalid role ID format", "INVALID_ROLE_ID"),
      { status: 400 }
    )
  }

  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID format", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  const date = dateParam ? new Date(dateParam) : new Date()

  // Validate date
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      formatError("Invalid date parameter", "INVALID_DATE"),
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const manager = new RoleAssignmentManager()

    // Get employees assigned to this role at this location
    const assignments = await manager.getEmployeesForRole(roleId, locationId, date)

    // Transform assignments to employee availability format
    const employees = assignments.map((assignment: any) => {
      const employeeData = assignment.employeeId

      return {
        employeeId: employeeData._id.toString(),
        employeeName: employeeData.name,
        assignmentId: assignment._id.toString(),
        validFrom: assignment.validFrom.toISOString(),
        validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
      }
    })

    return NextResponse.json(
      formatSuccess(
        { employees },
        {
          count: employees.length,
          roleId,
          locationId,
          date: date.toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err) {
    console.error("[api/employees/availability GET]", err)

    // Handle RoleAssignmentError
    if (err instanceof RoleAssignmentError) {
      return NextResponse.json(
        formatError(err.message, err.code),
        { status: err.statusCode }
      )
    }

    // Handle database connection errors
    if (err instanceof Error && (err.message?.includes("connection") || err.message?.includes("timeout"))) {
      return NextResponse.json(
        formatError("Database connection error. Please try again later.", "DATABASE_CONNECTION_ERROR"),
        { status: 503 }
      )
    }

    return NextResponse.json(
      formatError("Failed to fetch available employees", "FETCH_FAILED"),
      { status: 500 }
    )
  }
}
