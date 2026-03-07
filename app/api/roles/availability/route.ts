import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB } from "@/lib/db"
import { RoleEnablementManager } from "@/lib/managers/role-enablement-manager"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import mongoose from "mongoose"
import { z } from "zod"

// Validation schema for query parameters
const querySchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  date: z.string().datetime().optional(),
})

/**
 * GET /api/roles/availability
 * Get available roles for a location on a specific date
 * 
 * Query Parameters:
 * - locationId: string (required) - The location ID to check
 * - date: string (optional) - ISO date string (defaults to today)
 * 
 * Returns:
 * - roles: Array of role objects with availability information
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get("locationId")
  const dateParam = searchParams.get("date")

  // Validate query parameters
  const parsed = querySchema.safeParse({
    locationId,
    date: dateParam || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { locationId: validLocationId, date: dateString } = parsed.data

  // Validate locationId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(validLocationId)) {
    return NextResponse.json(
      { error: "Invalid location ID format" },
      { status: 400 }
    )
  }

  try {
    await connectDB()

    const date = dateString ? new Date(dateString) : new Date()
    const manager = new RoleEnablementManager()

    // Get enabled roles for the location
    const enablements = await manager.getEnabledRoles(validLocationId, date)

    // Get employee counts for each role at this location
    const rolesWithCounts = await Promise.all(
      enablements.map(async (enablement) => {
        const roleId = enablement.roleId as any
        
        // Count employees assigned to this role at this location on the specified date
        const employeeCount = await EmployeeRoleAssignment.countDocuments({
          roleId: roleId._id,
          locationId: new mongoose.Types.ObjectId(validLocationId),
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
          employeeCount,
          isEnabled: true,
        }
      })
    )

    // Set caching headers (5 minutes)
    const headers = new Headers()
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300")
    headers.set("CDN-Cache-Control", "public, max-age=300")

    return NextResponse.json(
      { roles: rolesWithCounts },
      { headers }
    )
  } catch (err) {
    console.error("[api/roles/availability GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch available roles" },
      { status: 500 }
    )
  }
}
