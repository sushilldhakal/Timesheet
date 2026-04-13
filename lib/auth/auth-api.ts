import { connectDB, User } from "@/lib/db"
import { getAuthFromCookie, type AuthPayload } from "./auth-helpers"
import { NextRequest } from "next/server"

export type AuthWithLocations = {
  auth: AuthPayload
  /** Tenant (employer) ObjectId from the user's document — used for all scoped queries. */
  tenantId: string
  /** null = admin, sees all. string[] = user's locations, filter employees to these. */
  userLocations: string[] | null
  /** null = admin, sees all. string[] = user's managed roles, filter employees to these. Empty array = see all roles at their locations. */
  managedRoles: string[] | null
}

/**
 * Verify authentication and return full user document from database.
 * Returns null if not authenticated or user not found.
 */
export async function verifyAuth(_req: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) return null

  try {
    await connectDB()
    const user = await User.findById(auth.sub).lean()
    if (!user) return null
    
    return {
      _id: user._id,
      username: user.username,
      role: user.role,
      location: Array.isArray(user.location) ? user.location : user.location ? [user.location] : [],
      managedRoles: user.managedRoles ?? [],
      rights: user.rights ?? [],
    }
  } catch (error) {
    console.error("[verifyAuth] Error:", error)
    return null
  }
}

/**
 * Returns auth + user's location array for filtering employees.
 * Admin: userLocations = null (no filter, see all employees).
 * User: userLocations = User.location array; filter employees to those assigned to these locations.
 */
export async function getAuthWithUserLocations(): Promise<AuthWithLocations | null> {
  const auth = await getAuthFromCookie()
  if (!auth) return null

  try {
    await connectDB()
    const user = await User.findById(auth.sub).select("tenantId location managedRoles").lean()
    if (!user?.tenantId) return null

    const tenantId = String(user.tenantId)

    if (auth.role === "admin" || auth.role === "super_admin") {
      return { auth, tenantId, userLocations: null, managedRoles: null }
    }

    const locs = user?.location
    const userLocations: string[] = Array.isArray(locs)
      ? locs.map((x) => String(x).trim()).filter(Boolean)
      : locs != null && String(locs).trim() !== ""
        ? [String(locs).trim()]
        : []
    
    const roles = user?.managedRoles
    const managedRoles: string[] = Array.isArray(roles)
      ? roles.map((x) => String(x).trim()).filter(Boolean)
      : []
    
    return { auth, tenantId, userLocations, managedRoles }
  } catch {
    return null
  }
}

/**
 * Build employee location filter for non-admin users.
 * Returns a MongoDB query condition to add to $and, or {} if no filter.
 */
export function employeeLocationFilter(userLocations: string[] | null): Record<string, unknown> {
  if (!userLocations || userLocations.length === 0) return {}
  return {
    location: { $in: userLocations }
  }
}

/**
 * Build employee role filter for non-admin users with managed roles.
 * Returns employee IDs that match the user's managed roles at their locations.
 * If managedRoles is empty, returns null (no role filter - see all employees at their locations).
 * If managedRoles has values, returns employee IDs that have those roles.
 */
export async function getFilteredEmployeeIdsByRole(
  userLocations: string[] | null,
  managedRoles: string[] | null
): Promise<string[] | null> {
  // Admin sees all
  if (userLocations === null || managedRoles === null) {
    return null
  }

  // No managed roles = see all employees at their locations (no role filter)
  if (managedRoles.length === 0) {
    return null
  }

  // Has managed roles = filter by those roles
  try {
    await connectDB()
    const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
    const { Team, Location } = await import("@/lib/db")

    // Get role IDs from role names
    const roleCategories = await Team.find({
      name: { $in: managedRoles },
    })
      .select("_id")
      .lean()

    const roleIds = roleCategories.map(r => r._id)

    if (roleIds.length === 0) {
      return [] // No matching roles found
    }

    // Get location IDs from location names
    const locationCategories = await Location.find({
      name: { $in: userLocations },
    })
      .select("_id")
      .lean()

    const locationIds = locationCategories.map(l => l._id)

    if (locationIds.length === 0) {
      return [] // No matching locations found
    }

    // Find active role assignments matching the criteria
    const assignments = await EmployeeRoleAssignment.find({
      roleId: { $in: roleIds },
      locationId: { $in: locationIds },
      isActive: true
    }).select("employeeId").lean()

    // Return unique employee IDs
    const employeeIds = Array.from(
      new Set(assignments.map(a => a.employeeId.toString()))
    )

    return employeeIds
  } catch (error) {
    console.error("[getFilteredEmployeeIdsByRole] Error:", error)
    return []
  }
}
