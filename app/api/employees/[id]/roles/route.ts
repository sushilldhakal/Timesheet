import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { Employee } from "@/lib/db/schemas/employee"
import { formatSuccess, formatError } from "@/lib/utils/api-response"
import mongoose from "mongoose"
import { z } from "zod"

// Validation schema for assigning a role
const assignRoleSchema = z.object({
  roleId: z
    .string()
    .min(1, "Role ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid role ID format",
    }),
  locationId: z
    .string()
    .min(1, "Location ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid location ID format",
    }),
  validFrom: z
    .string()
    .datetime({ message: "Valid from must be a valid ISO 8601 date" })
    .optional(),
  validTo: z
    .string()
    .datetime({ message: "Valid to must be a valid ISO 8601 date" })
    .nullable()
    .optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
})
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validFrom) <= new Date(data.validTo)
      }
      return true
    },
    {
      message: "Valid from date must be before or equal to valid to date",
      path: ["validTo"],
    }
  )

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/employees/[id]/roles
 * Get all role assignments for an employee
 * 
 * Query Parameters:
 * - locationId: Filter by location (optional)
 * - date: Date to check (default: today)
 * - includeInactive: Include expired assignments (default: false)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json(
      formatError("Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    )
  }

  const { id: employeeId } = await context.params
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get("locationId")
  const dateParam = searchParams.get("date")
  const includeInactive = searchParams.get("includeInactive") === "true"

  // Validate employeeId
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID"),
      { status: 400 }
    )
  }

  // Validate locationId if provided
  if (locationId && !mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  try {
    await connectDB()

    // Verify employee exists
    const employee = await Employee.findById(employeeId)
    if (!employee) {
      return NextResponse.json(
        formatError("Employee not found", "EMPLOYEE_NOT_FOUND"),
        { status: 404 }
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

    const manager = new RoleAssignmentManager()

    // Get employee's role assignments
    const assignments = await manager.getEmployeeAssignments(
      employeeId,
      locationId || undefined,
      date,
      includeInactive
    )

    // Format response
    const formattedAssignments = assignments.map((assignment: any) => {
      const roleData = assignment.roleId as any
      const locationData = assignment.locationId as any

      return {
        id: assignment._id.toString(),
        roleId: roleData._id.toString(),
        roleName: roleData.name,
        roleColor: roleData.color,
        locationId: locationData._id.toString(),
        locationName: locationData.name,
        locationColor: locationData.color,
        validFrom: assignment.validFrom,
        validTo: assignment.validTo,
        isActive: assignment.isActive,
        notes: assignment.notes,
        assignedAt: assignment.assignedAt,
      }
    })

    return NextResponse.json(
      formatSuccess(
        { assignments: formattedAssignments },
        {
          count: formattedAssignments.length,
          employeeId,
          date: date.toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err) {
    console.error("[api/employees/[id]/roles GET]", err)
    
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
      formatError("Failed to fetch employee role assignments", "FETCH_FAILED"),
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/[id]/roles
 * Assign employee to a role at a location
 * 
 * Request Body:
 * - roleId: string (required)
 * - locationId: string (required)
 * - validFrom: string (ISO date, optional, defaults to now)
 * - validTo: string | null (ISO date, optional, null = indefinite)
 * - notes: string (optional)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json(
      formatError("Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    )
  }

  const { id: employeeId } = await context.params

  // Validate employeeId
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID"),
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = assignRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        formatError(
          "Validation failed",
          "VALIDATION_ERROR",
          parsed.error.flatten().fieldErrors
        ),
        { status: 400 }
      )
    }

    const { roleId, locationId, validFrom, validTo, notes } = parsed.data

    await connectDB()

    const manager = new RoleAssignmentManager()
    const assignment = await manager.assignRole({
      employeeId,
      roleId,
      locationId,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validTo: validTo ? new Date(validTo) : null,
      userId: auth.sub,
      notes,
    }) as any

    // Populate assignment details
    const populatedAssignment = await EmployeeRoleAssignment.findById(assignment._id)
      .populate("roleId", "name color type")
      .populate("locationId", "name type")

    if (!populatedAssignment) {
      return NextResponse.json(
        formatError("Failed to retrieve created assignment", "ASSIGNMENT_NOT_FOUND"),
        { status: 500 }
      )
    }

    const roleData = populatedAssignment.roleId as any
    const locationData = populatedAssignment.locationId as any

    return NextResponse.json(
      formatSuccess(
        {
          assignment: {
            id: populatedAssignment._id.toString(),
            employeeId: populatedAssignment.employeeId.toString(),
            roleId: roleData._id.toString(),
            roleName: roleData.name,
            roleColor: roleData.color,
            locationId: locationData._id.toString(),
            locationName: locationData.name,
            validFrom: populatedAssignment.validFrom,
            validTo: populatedAssignment.validTo,
            isActive: populatedAssignment.isActive,
            notes: populatedAssignment.notes,
            assignedAt: populatedAssignment.assignedAt,
          },
        },
        {
          createdAt: populatedAssignment.assignedAt?.toISOString(),
        }
      ),
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[api/employees/[id]/roles POST]", err)
    
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

    // Handle JSON parsing errors
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        formatError("Invalid JSON in request body", "INVALID_JSON"),
        { status: 400 }
      )
    }

    return NextResponse.json(
      formatError("Failed to assign role to employee", "ASSIGN_FAILED"),
      { status: 500 }
    )
  }
}
