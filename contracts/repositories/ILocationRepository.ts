import type { EntityId, PaginatedResult, TenantContext } from "@/shared/types"
import type { LocationDTO } from "@/contracts/dtos/location"

export interface ILocationRepository {
  findById(ctx: TenantContext, id: EntityId): Promise<LocationDTO | null>
  findMany(ctx: TenantContext, filters: unknown): Promise<PaginatedResult<LocationDTO>>
  create(ctx: TenantContext, data: unknown): Promise<LocationDTO>
  update(ctx: TenantContext, id: EntityId, data: unknown): Promise<LocationDTO | null>
  delete(ctx: TenantContext, id: EntityId): Promise<boolean>
}

