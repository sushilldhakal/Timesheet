import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { RoleAssignmentManager, RoleAssignmentError } from "@/lib/managers/role-assignment-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { formatSuccess, formatError } from "@/lib/utils/api-response"
import mongoose from "mongoose"
import { z } from "zod"

// Validation schema for updating an assignment
const updateAssignmentSchema = z.object({
  validTo: z
    .string()
    .datetime({ message: "Valid to must be a valid ISO 8601 date" })
    .nullable()
    .optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
})

type RouteContext = { 
  params: Promise<{ 
    id: string
    assignmentId: string 
  }> 
}

/**
 * PATCH /api/employees/[id]/roles/[assignmentId]
 * Update role assignment (typically to set end date)
 * 
 * Request Body:
 * - validTo: string | null (ISO date, optional)
 * - notes: string (optional)
 */
export async function PATCH(
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

  const { id: employeeId, assignmentId } = await context.params

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID"),
      { status: 400 }
    )
  }

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json(
      formatError("Invalid assignment ID", "INVALID_ASSIGNMENT_ID"),
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateAssignmentSchema.safeParse(body)

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

    const { validTo, notes } = parsed.data

    await connectDB()

    // Find the assignment
    const assignment = await EmployeeRoleAssignment.findOne({
      _id: new mongoose.Types.ObjectId(assignmentId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
    })

    if (!assignment) {
      return NextResponse.json(
        formatError("Assignment not found", "ASSIGNMENT_NOT_FOUND"),
        { status: 404 }
      )
    }

    // Validate validTo is after validFrom
    if (validTo !== undefined && validTo !== null) {
      const validToDate = new Date(validTo)
      if (validToDate < assignment.validFrom) {
        return NextResponse.json(
          formatError(
            "Valid to date must be after or equal to valid from date",
            "INVALID_DATE_RANGE",
            {
              validTo: ["Valid to date must be after or equal to valid from date"]
            }
          ),
          { status: 400 }
        )
      }
    }

    // Update fields
    if (validTo !== undefined) {
      assignment.validTo = validTo ? new Date(validTo) : null
      
      // Recompute isActive
      const now = new Date()
      assignment.isActive = assignment.validFrom <= now && (!assignment.validTo || assignment.validTo >= now)
    }

    if (notes !== undefined) {
      assignment.notes = notes
    }

    await assignment.save()

    // Populate assignment details
    const populatedAssignment = await EmployeeRoleAssignment.findById(assignment._id)
      .populate("roleId", "name color type")
      .populate("locationId", "name type")

    if (!populatedAssignment) {
      return NextResponse.json(
        formatError("Failed to retrieve updated assignment", "ASSIGNMENT_NOT_FOUND"),
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
          updatedAt: populatedAssignment.updatedAt?.toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[api/employees/[id]/roles/[assignmentId] PATCH]", err)
    
    // Handle RoleAssignmentError
    if (err instanceof RoleAssignmentError) {
      return NextResponse.json(
        formatError(err.message, err.code),
        { status: err.statusCode }
      )
    }

    // Handle database validation errors
    if (err.name === "ValidationError") {
      return NextResponse.json(
        formatError(`Validation error: ${err.message}`, "DATABASE_VALIDATION_ERROR"),
        { status: 400 }
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
      formatError("Failed to update assignment", "UPDATE_FAILED"),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/employees/[id]/roles/[assignmentId]
 * Remove role assignment (sets validTo to now)
 */
export async function DELETE(
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

  const { id: employeeId, assignmentId } = await context.params

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      formatError("Invalid employee ID", "INVALID_EMPLOYEE_ID"),
      { status: 400 }
    )
  }

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json(
      formatError("Invalid assignment ID", "INVALID_ASSIGNMENT_ID"),
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const manager = new RoleAssignmentManager()
    await manager.endAssignment(assignmentId, auth.sub)

    return NextResponse.json(
      formatSuccess(
        { message: "Assignment ended successfully" },
        {
          employeeId,
          assignmentId,
          endedAt: new Date().toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[api/employees/[id]/roles/[assignmentId] DELETE]", err)
    
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
      formatError("Failed to end assignment", "END_ASSIGNMENT_FAILED"),
      { status: 500 }
    )
  }
}
