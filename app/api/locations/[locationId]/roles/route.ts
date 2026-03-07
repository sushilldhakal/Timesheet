import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import { Category } from "@/lib/db/schemas/category"
import { formatSuccess, formatError } from "@/lib/utils/api-response"
import mongoose from "mongoose"
import { z } from "zod"

// Validation schema for enabling a role
const enableRoleSchema = z.object({
  roleId: z.string().min(1, "Role ID is required"),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

type RouteContext = { params: Promise<{ locationId: string }> }

/**
 * GET /api/locations/[locationId]/roles
 * Get all roles enabled at a location
 * 
 * Query Parameters:
 * - date: Date to check (default: today)
 * - includeInactive: Include expired enablements (default: false)
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

  const { locationId } = await context.params
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const includeInactive = searchParams.get("includeInactive") === "true"

  // Validate locationId
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  try {
    await connectDB()

    // Verify location exists
    const location = await Category.findOne({
      _id: new mongoose.Types.ObjectId(locationId),
      type: "location",
    })

    if (!location) {
      return NextResponse.json(
        formatError("Location not found", "LOCATION_NOT_FOUND"),
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

    const manager = new RoleEnablementManager()

    // Get enabled roles
    const enablements = await manager.getEnabledRoles(locationId, date)

    // Get employee counts for each role at this location
    const rolesWithCounts = await Promise.all(
      enablements.map(async (enablement) => {
        const roleId = enablement.roleId as any
        
        // Count employees assigned to this role at this location
        const employeeCount = await EmployeeRoleAssignment.countDocuments({
          roleId: roleId._id,
          locationId: new mongoose.Types.ObjectId(locationId),
          validFrom: { $lte: date },
          $or: [
            { validTo: null },
            { validTo: { $gte: date } },
          ],
        })

        return {
          roleId: roleId._id.toString(),
          roleName: roleId.name,
          roleColor: roleId.color,
          effectiveFrom: enablement.effectiveFrom,
          effectiveTo: enablement.effectiveTo,
          isActive: enablement.isActive,
          employeeCount,
        }
      })
    )

    return NextResponse.json(
      formatSuccess(
        { roles: rolesWithCounts },
        {
          count: rolesWithCounts.length,
          locationId,
          date: date.toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err) {
    console.error("[api/locations/[locationId]/roles GET]", err)

    // Handle RoleEnablementError
    if (err instanceof RoleEnablementError) {
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
      formatError("Failed to fetch enabled roles", "FETCH_FAILED"),
      { status: 500 }
    )
  }
}

/**
 * POST /api/locations/[locationId]/roles
 * Enable a role at a location
 * 
 * Request Body:
 * - roleId: string (required)
 * - effectiveFrom: string (ISO date, optional, defaults to now)
 * - effectiveTo: string | null (ISO date, optional, null = indefinite)
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

  const { locationId } = await context.params

  // Validate locationId
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = enableRoleSchema.safeParse(body)

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

    const { roleId, effectiveFrom, effectiveTo } = parsed.data

    // Validate roleId
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        formatError("Invalid role ID", "INVALID_ROLE_ID"),
        { status: 400 }
      )
    }

    await connectDB()

    const manager = new RoleEnablementManager()
    const enablement = await manager.enableRole({
      locationId,
      roleId,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      userId: auth.sub,
    }) as any // Manager returns Document but types as interface

    // Populate role details
    const populatedEnablement = await LocationRoleEnablement.findById(enablement._id)
      .populate("roleId", "name color type")

    if (!populatedEnablement) {
      return NextResponse.json(
        formatError("Failed to retrieve created enablement", "ENABLEMENT_NOT_FOUND"),
        { status: 500 }
      )
    }

    const roleData = populatedEnablement.roleId as any

    return NextResponse.json(
      formatSuccess(
        {
          enablement: {
            id: populatedEnablement._id.toString(),
            locationId: populatedEnablement.locationId.toString(),
            roleId: roleData._id.toString(),
            roleName: roleData.name,
            roleColor: roleData.color,
            effectiveFrom: populatedEnablement.effectiveFrom,
            effectiveTo: populatedEnablement.effectiveTo,
            isActive: populatedEnablement.isActive,
          },
        },
        {
          createdAt: populatedEnablement.createdAt?.toISOString(),
        }
      ),
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[api/locations/[locationId]/roles POST]", err)
    
    // Handle RoleEnablementError
    if (err instanceof RoleEnablementError) {
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
      formatError("Failed to enable role at location", "ENABLE_FAILED"),
      { status: 500 }
    )
  }
}
