import { MongoUserRepository } from "@/infrastructure/db/mongo/MongoUserRepository"
import { MongoEmployeeRoleFilterRepository } from "@/infrastructure/db/mongo/MongoEmployeeRoleFilterRepository"
import type { TenantContext } from "@/shared/types"
import { getAuthFromCookie, type AuthPayload } from "./auth-helpers"
import { NextRequest } from "next/server"
import { SUPER_ADMIN_SENTINEL } from "./auth-constants"

// Re-export for backward compatibility
export { SUPER_ADMIN_SENTINEL }

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
 * Returns true if and only if the auth payload belongs to a platform super admin.
 * Super admins have cross-tenant access and use the sentinel tenantId.
 */
export function isSuperAdminAuth(auth: AuthPayload | null | undefined): boolean {
  return auth?.role === "super_admin" && auth?.tenantId === SUPER_ADMIN_SENTINEL
}

/**
 * Verify authentication and return full user document from database.
 * Returns null if not authenticated or user not found.
 */
export async function verifyAuth(_req: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) return null

  try {
    const userRepo = new MongoUserRepository()
    const user = await userRepo.findById({ tenantId: auth.tenantId ?? "" }, auth.sub)
    if (!user) return null
    
    return {
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role,
      location: user.location ?? [],
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

  // Super admin: bypass tenantId guard entirely
  if (isSuperAdminAuth(auth)) {
    return { auth, tenantId: SUPER_ADMIN_SENTINEL, userLocations: null, managedRoles: null }
  }

  const tenantId = auth.tenantId ? String(auth.tenantId) : ""
  if (!tenantId) return null

  // Admins see everything (no location/role filters)
  if (auth.role === "admin" || auth.role === "super_admin") {
    return { auth, tenantId, userLocations: null, managedRoles: null }
  }

  // JWT-only scoping (DB-free). Empty arrays mean "no restriction".
  const locations = Array.isArray(auth.locations) ? auth.locations : []
  const managedRoles = Array.isArray(auth.managedRoles) ? auth.managedRoles : []

  return {
    auth,
    tenantId,
    userLocations: locations.length > 0 ? locations : [],
    managedRoles: managedRoles.length > 0 ? managedRoles : [],
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
const defaultEmployeeRoleFilterRepo = new MongoEmployeeRoleFilterRepository()

/**
 * @param ctx Tenant context (tenantId injected by caller; never build ad-hoc tenant filters in services).
 */
export async function getFilteredEmployeeIdsByRole(
  ctx: TenantContext,
  userLocations: string[] | null,
  managedRoles: string[] | null
): Promise<string[] | null> {
  return defaultEmployeeRoleFilterRepo.getFilteredEmployeeIdsByRole(ctx, userLocations, managedRoles)
}
