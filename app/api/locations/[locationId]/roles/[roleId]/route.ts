import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager, RoleEnablementError } from "@/lib/managers/role-enablement-manager"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"
import { formatSuccess, formatError } from "@/lib/utils/api-response"
import mongoose from "mongoose"
import { z } from "zod"

// Validation schema for updating role enablement
const updateEnablementSchema = z.object({
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

type RouteContext = { params: Promise<{ locationId: string; roleId: string }> }

/**
 * DELETE /api/locations/[locationId]/roles/[roleId]
 * Disable a role at a location (sets effectiveTo to now)
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

  const { locationId, roleId } = await context.params

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    return NextResponse.json(
      formatError("Invalid role ID", "INVALID_ROLE_ID"),
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const manager = new RoleEnablementManager()
    await manager.disableRole(locationId, roleId, auth.sub)

    return NextResponse.json(
      formatSuccess(
        { message: "Role disabled at location" },
        {
          locationId,
          roleId,
          disabledAt: new Date().toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[api/locations/[locationId]/roles/[roleId] DELETE]", err)

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
      formatError("Failed to disable role at location", "DISABLE_FAILED"),
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/locations/[locationId]/roles/[roleId]
 * Update role enablement dates
 * 
 * Request Body:
 * - effectiveFrom: string (ISO date, optional)
 * - effectiveTo: string | null (ISO date, optional)
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

  const { locationId, roleId } = await context.params

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json(
      formatError("Invalid location ID", "INVALID_LOCATION_ID"),
      { status: 400 }
    )
  }

  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    return NextResponse.json(
      formatError("Invalid role ID", "INVALID_ROLE_ID"),
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = updateEnablementSchema.safeParse(body)

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

    const { effectiveFrom, effectiveTo } = parsed.data

    await connectDB()

    // Find the current active enablement
    const now = new Date()
    const enablement = await LocationRoleEnablement.findOne({
      locationId: new mongoose.Types.ObjectId(locationId),
      roleId: new mongoose.Types.ObjectId(roleId),
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gt: now } },
      ],
    })

    if (!enablement) {
      return NextResponse.json(
        formatError("No active role enablement found", "NO_ACTIVE_ENABLEMENT"),
        { status: 404 }
      )
    }

    // Update the dates
    if (effectiveFrom) {
      const newEffectiveFrom = new Date(effectiveFrom)
      
      // Validate date is valid
      if (isNaN(newEffectiveFrom.getTime())) {
        return NextResponse.json(
          formatError("Invalid effectiveFrom date", "INVALID_EFFECTIVE_FROM"),
          { status: 400 }
        )
      }
      
      // Validate date range
      if (enablement.effectiveTo && newEffectiveFrom > enablement.effectiveTo) {
        return NextResponse.json(
          formatError(
            "effectiveFrom must be before or equal to effectiveTo",
            "INVALID_DATE_RANGE"
          ),
          { status: 400 }
        )
      }
      
      enablement.effectiveFrom = newEffectiveFrom
    }

    if (effectiveTo !== undefined) {
      const newEffectiveTo = effectiveTo ? new Date(effectiveTo) : null
      
      // Validate date is valid
      if (newEffectiveTo && isNaN(newEffectiveTo.getTime())) {
        return NextResponse.json(
          formatError("Invalid effectiveTo date", "INVALID_EFFECTIVE_TO"),
          { status: 400 }
        )
      }
      
      // Validate date range
      if (newEffectiveTo && enablement.effectiveFrom > newEffectiveTo) {
        return NextResponse.json(
          formatError(
            "effectiveFrom must be before or equal to effectiveTo",
            "INVALID_DATE_RANGE"
          ),
          { status: 400 }
        )
      }
      
      enablement.effectiveTo = newEffectiveTo
    }

    await enablement.save()

    // Populate role details
    await enablement.populate("roleId", "name color type")

    const roleData = enablement.roleId as any

    return NextResponse.json(
      formatSuccess(
        {
          enablement: {
            id: enablement._id.toString(),
            locationId: enablement.locationId.toString(),
            roleId: enablement.roleId.toString(),
            roleName: roleData.name,
            roleColor: roleData.color,
            effectiveFrom: enablement.effectiveFrom,
            effectiveTo: enablement.effectiveTo,
            isActive: enablement.isActive,
          },
        },
        {
          updatedAt: enablement.updatedAt?.toISOString(),
        }
      ),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[api/locations/[locationId]/roles/[roleId] PATCH]", err)

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
      formatError("Failed to update role enablement", "UPDATE_FAILED"),
      { status: 500 }
    )
  }
}
