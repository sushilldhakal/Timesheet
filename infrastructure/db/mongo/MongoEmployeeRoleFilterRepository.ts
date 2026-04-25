import type { IEmployeeRoleFilterRepository } from "@/contracts/repositories/IEmployeeRoleFilterRepository"
import type { TenantContext } from "@/shared/types"
import { connectDB, Location, Team } from "@/lib/db"
import { EmployeeTeamAssignment } from "@/lib/db/schemas/employee-team-assignment"
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants"
import { toObjectId } from "./mongo-ids"

export class MongoEmployeeRoleFilterRepository implements IEmployeeRoleFilterRepository {
  async getFilteredEmployeeIdsByRole(
    ctx: TenantContext,
    userLocations: string[] | null,
    managedRoles: string[] | null
  ): Promise<string[] | null> {
    if (userLocations === null || managedRoles === null) return null
    if (managedRoles.length === 0) return null

    try {
      await connectDB()

      const teamQuery: Record<string, unknown> = { name: { $in: managedRoles } }
      const locQuery: Record<string, unknown> = { name: { $in: userLocations } }
      if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
        const tid = toObjectId(ctx.tenantId)
        teamQuery.tenantId = tid
        locQuery.tenantId = tid
      }

      const roleCategories = await Team.find(teamQuery).select("_id").lean()
      const roleIds = roleCategories.map((r) => r._id)
      if (roleIds.length === 0) return []

      const locationCategories = await Location.find(locQuery).select("_id").lean()
      const locationIds = locationCategories.map((l) => l._id)
      if (locationIds.length === 0) return []

      const assignmentQuery: Record<string, unknown> = {
        teamId: { $in: roleIds },
        locationId: { $in: locationIds },
        isActive: true,
      }
      if (ctx.tenantId !== SUPER_ADMIN_SENTINEL) {
        assignmentQuery.tenantId = toObjectId(ctx.tenantId)
      }

      const assignments = await EmployeeTeamAssignment.find(assignmentQuery).select("employeeId").lean()

      return Array.from(new Set(assignments.map((a) => a.employeeId.toString())))
    } catch (error) {
      console.error("[MongoEmployeeRoleFilterRepository] Error:", error)
      return []
    }
  }
}
