import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import type { TeamDTO } from "@/contracts/dtos/team"

export interface ITeamRepository {
  findById(ctx: TenantContext, id: EntityId): Promise<TeamDTO | null>
  findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<TeamDTO>>
  create(ctx: TenantContext, data: unknown): Promise<TeamDTO>
  update(ctx: TenantContext, id: EntityId, data: unknown): Promise<TeamDTO | null>
  delete(ctx: TenantContext, id: EntityId): Promise<boolean>
}

