import type { TenantContext } from "@/shared/types"

/**
 * Resolves which employee IDs a scoped user may see when they have managed role names
 * and location names from JWT (not ObjectIds).
 */
export interface IEmployeeRoleFilterRepository {
  getFilteredEmployeeIdsByRole(
    ctx: TenantContext,
    userLocations: string[] | null,
    managedRoles: string[] | null
  ): Promise<string[] | null>
}
